#!/usr/bin/env node

import { resolve4, resolve6 } from "node:dns/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";
import { getDomain, parse as parseDomain } from "tldts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "1.1.0";
const DEFAULT_VIEWER = "https://tracelattice.vercel.app/deep-scan";
const MAX_REQUESTS = 400;
const MAX_CONSOLE = 40;
const MAX_FAILURES = 80;
const MAX_REPORT_BYTES = 750_000;
const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain", "0.0.0.0", "127.0.0.1", "::1"]);
const SECURITY_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "cross-origin-embedder-policy",
];

function usage() {
  console.log(`
TraceLattice local runtime scanner

Usage:
  npm run deep-scan -- <url> [options]

Options:
  --headed             Show the browser while scanning
  --timeout <seconds>  Navigation timeout, 10-90 seconds (default: 30)
  --settle <seconds>   Observe runtime activity after load, 1-20 seconds (default: 5)
  --output <file>      JSON output path
  --viewer <url>       Report viewer URL
  --no-open            Do not open the report viewer
  --help               Show this help

Example:
  npm run deep-scan -- https://example.com
`);
}

function parseArgs(argv) {
  const options = {
    target: "",
    headed: false,
    timeoutMs: 30_000,
    settleMs: 5_000,
    output: "",
    viewer: DEFAULT_VIEWER,
    open: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--help" || value === "-h") return { ...options, help: true };
    if (value === "--headed") options.headed = true;
    else if (value === "--no-open") options.open = false;
    else if (value === "--timeout") options.timeoutMs = clampSeconds(argv[++index], 10, 90) * 1_000;
    else if (value === "--settle") options.settleMs = clampSeconds(argv[++index], 1, 20) * 1_000;
    else if (value === "--output") options.output = argv[++index] || "";
    else if (value === "--viewer") options.viewer = argv[++index] || DEFAULT_VIEWER;
    else if (value.startsWith("--")) throw new Error(`Unknown option: ${value}`);
    else if (!options.target) options.target = value;
    else throw new Error(`Unexpected argument: ${value}`);
  }
  return options;
}

function clampSeconds(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`Expected a number between ${min} and ${max}.`);
  }
  return parsed;
}

function ipv4ToNumber(ip) {
  return ip.split(".").reduce((sum, part) => (sum << 8) + Number(part), 0) >>> 0;
}

function inCidr(ip, base, bits) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(base) & mask);
}

function isBlockedIp(ip) {
  if (isIP(ip) === 4) {
    return [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ].some(([base, bits]) => inCidr(ip, base, bits));
  }

  if (isIP(ip) === 6) {
    const normalized = ip.toLowerCase();
    return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") ||
      normalized.startsWith("fd") || normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") || normalized.startsWith("fea") ||
      normalized.startsWith("feb") || normalized.startsWith("ff") ||
      normalized.startsWith("::ffff:127.") || normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.");
  }
  return true;
}

function normalizeTarget(input) {
  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input) ? input : `https://${input}`;
  const url = new URL(candidate);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS targets are supported.");
  if (url.username || url.password) throw new Error("Embedded credentials are not allowed.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only standard ports 80 and 443 are allowed.");
  url.hash = "";
  return url;
}

async function createPublicHostValidator() {
  const cache = new Map();
  return async (hostname) => {
    const normalized = hostname.toLowerCase().replace(/\.$/, "");
    if (cache.has(normalized)) return cache.get(normalized);

    const validation = (async () => {
      if (BLOCKED_HOSTNAMES.has(normalized) || normalized.endsWith(".local") || normalized.endsWith(".internal")) {
        throw new Error("Local and internal destinations are blocked.");
      }
      if (isIP(normalized)) {
        if (isBlockedIp(normalized)) throw new Error("Private or reserved IP address blocked.");
        return true;
      }
      const parsed = parseDomain(normalized);
      if (!parsed.publicSuffix || !parsed.domain) throw new Error("Hostname does not have a valid public suffix.");
      const resolved = await Promise.allSettled([resolve4(normalized), resolve6(normalized)]);
      const addresses = resolved.flatMap((item) => item.status === "fulfilled" ? item.value : []);
      if (!addresses.length) throw new Error("Hostname could not be resolved.");
      if (addresses.some(isBlockedIp)) throw new Error("Hostname resolves to a private or reserved address.");
      return true;
    })();

    cache.set(normalized, validation);
    return validation;
  };
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.hash = "";
    if (url.search) {
      const keys = [...new Set([...url.searchParams.keys()])].slice(0, 12);
      url.search = keys.length ? `?${keys.map((key) => `${encodeURIComponent(key)}=[redacted]`).join("&")}` : "";
    }
    return url.toString();
  } catch {
    return value.slice(0, 500);
  }
}

function redactText(value) {
  return value
    .replace(/bearer\s+[a-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/([?&](?:token|key|secret|code|session|auth)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email redacted]")
    .slice(0, 300);
}

async function readTrackerPatterns() {
  const text = await readFile(resolve(ROOT, "src/data/trackerPatterns.json"), "utf8");
  return JSON.parse(text);
}

function trackerFor(hostname, patterns) {
  return patterns.find((item) => hostname === item.pattern || hostname.endsWith(`.${item.pattern}`));
}

function rootDomainFor(hostname) {
  return getDomain(hostname, { allowPrivateDomains: true }) || hostname;
}

function buildFindings(report) {
  const findings = [];
  const add = (id, title, risk, confidence, evidence, recommendation) => {
    findings.push({ id, title, risk, confidence, evidence, recommendation });
  };
  const trackerCategories = [...new Set(report.thirdParties.map((item) => item.trackerCategory).filter(Boolean))];
  const thirdPartyScripts = report.requests.filter((item) => item.thirdParty && item.resourceType === "script").length;
  const insecureCookies = report.cookies.filter((item) => report.finalUrl.startsWith("https:") && !item.secure);
  const clientReadableCookies = report.cookies.filter((item) => !item.httpOnly);
  const mixedContent = report.requests.filter((item) => report.finalUrl.startsWith("https:") && item.url.startsWith("http:"));

  if (report.blockedRequests.length) {
    add("runtime-private-request", "Runtime request to a blocked network destination", "high", "high",
      `${report.blockedRequests.length} request(s) were blocked before reaching private, local, or reserved destinations.`,
      "Review the initiating script and remove browser-side requests to internal or local network addresses.");
  }
  if (trackerCategories.some((item) => item === "Advertising" || item === "Session replay")) {
    add("runtime-sensitive-trackers", "Advertising or session-replay technology loaded at runtime", "high", "high",
      `Observed runtime categories: ${trackerCategories.join(", ")}.`,
      "Confirm necessity, consent behavior, data handling, and contractual controls for each provider.");
  } else if (trackerCategories.length) {
    add("runtime-trackers", "Known tracker technology loaded at runtime", "medium", "high",
      `Observed runtime categories: ${trackerCategories.join(", ")}.`,
      "Document the purpose of each provider and verify that loading behavior matches user consent.");
  }
  if (thirdPartyScripts >= 5) {
    add("runtime-third-party-scripts", "Broad third-party script execution", "medium", "high",
      `${thirdPartyScripts} third-party script request(s) executed in the browser.`,
      "Reduce unnecessary script providers and apply CSP and Subresource Integrity where practical.");
  }
  if (insecureCookies.length) {
    add("runtime-insecure-cookies", "Cookies without the Secure flag", "high", "high",
      `${insecureCookies.length} cookie(s) observed without Secure on an HTTPS page.`,
      "Mark cookies Secure unless they are intentionally restricted to non-HTTPS development environments.");
  }
  if (clientReadableCookies.length) {
    add("runtime-client-readable-cookies", "Client-readable cookies require context", "medium", "high",
      `${clientReadableCookies.length} cookie(s) were accessible to JavaScript.`,
      "Apply HttpOnly to session or security-sensitive cookies that do not require client-side access.");
  }
  if (mixedContent.length) {
    add("runtime-mixed-content", "HTTP resources requested from an HTTPS page", "high", "high",
      `${mixedContent.length} mixed-content request(s) were observed.`,
      "Serve every subresource over HTTPS and remove insecure fallback URLs.");
  }
  if (!report.mainResponse.headers["content-security-policy"]) {
    add("runtime-csp", "Content-Security-Policy was not observed", "high", "high",
      "The final document response did not include a Content-Security-Policy header.",
      "Deploy a restrictive CSP and iterate with report-only mode before enforcement.");
  }
  if (report.storage.localStorageKeys.length || report.storage.sessionStorageKeys.length) {
    add("runtime-browser-storage", "Browser storage is used at runtime", "medium", "moderate",
      `${report.storage.localStorageKeys.length} localStorage key(s) and ${report.storage.sessionStorageKeys.length} sessionStorage key(s) were observed. Values were not collected.`,
      "Review stored data for identifiers, credentials, sensitive values, retention, and consent requirements.");
  }
  if (report.webSockets.length) {
    add("runtime-websockets", "WebSocket connections were observed", "medium", "high",
      `${report.webSockets.length} WebSocket endpoint(s) were opened.`,
      "Review authentication, origin validation, message authorization, and transport security for each endpoint.");
  }
  if (report.thirdParties.length > 10) {
    add("runtime-third-party-surface", "Large runtime third-party surface", "medium", "high",
      `${report.thirdParties.length} third-party domains received browser requests.`,
      "Inventory provider ownership, purpose, data categories, and failure impact.");
  }

  return findings;
}

async function launchBrowser(headed) {
  try {
    return await chromium.launch({ headless: !headed, channel: "chrome" });
  } catch (chromeError) {
    try {
      return await chromium.launch({ headless: !headed });
    } catch {
      const detail = chromeError instanceof Error ? chromeError.message.split("\n")[0] : "Chrome could not be launched.";
      throw new Error(`${detail}\nInstall Chrome or run: npx playwright install chromium`);
    }
  }
}

async function runScan(options) {
  const target = normalizeTarget(options.target);
  const validateHost = await createPublicHostValidator();
  await validateHost(target.hostname);
  const patterns = await readTrackerPatterns();
  const startedAt = new Date();
  const startedMs = Date.now();
  const browser = await launchBrowser(options.headed);
  const context = await browser.newContext({
    acceptDownloads: false,
    ignoreHTTPSErrors: false,
    serviceWorkers: "block",
    userAgent: "TraceLatticeLocal/1.0 PlaywrightRuntimeReview",
    viewport: { width: 1440, height: 900 },
  });

  const requests = [];
  const responseStatus = new Map();
  const failedRequests = [];
  const blockedRequests = [];
  const webSockets = new Set();
  const consoleEntries = [];
  let requestCount = 0;

  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    if (!url.startsWith("http:") && !url.startsWith("https:")) {
      await route.continue();
      return;
    }
    requestCount += 1;
    if (requestCount > MAX_REQUESTS) {
      blockedRequests.push({ url: safeUrl(url), reason: `Request cap of ${MAX_REQUESTS} reached.` });
      await route.abort("blockedbyclient");
      return;
    }
    try {
      await validateHost(new URL(url).hostname);
      await route.continue();
    } catch (error) {
      blockedRequests.push({
        url: safeUrl(url),
        reason: error instanceof Error ? error.message : "Unsafe destination blocked.",
      });
      await route.abort("blockedbyclient");
    }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(options.timeoutMs);
  page.on("request", (request) => {
    if (requests.length >= MAX_REQUESTS) return;
    const url = safeUrl(request.url());
    if (!url.startsWith("http:") && !url.startsWith("https:")) return;
    const hostname = new URL(url).hostname;
    const targetRoot = rootDomainFor(target.hostname);
    const requestRoot = rootDomainFor(hostname);
    const tracker = trackerFor(hostname, patterns);
    requests.push({
      url,
      domain: hostname,
      method: request.method(),
      resourceType: request.resourceType(),
      thirdParty: targetRoot !== requestRoot,
      ...(tracker ? { trackerCategory: tracker.category } : {}),
    });
  });
  page.on("response", (response) => responseStatus.set(safeUrl(response.url()), response.status()));
  page.on("requestfailed", (request) => {
    if (failedRequests.length >= MAX_FAILURES) return;
    failedRequests.push({
      url: safeUrl(request.url()),
      reason: request.failure()?.errorText || "Request failed.",
    });
  });
  page.on("websocket", (socket) => webSockets.add(safeUrl(socket.url())));
  page.on("console", (message) => {
    if (!["warning", "error"].includes(message.type()) || consoleEntries.length >= MAX_CONSOLE) return;
    consoleEntries.push({ type: message.type(), text: redactText(message.text()) });
  });
  page.on("pageerror", (error) => {
    if (consoleEntries.length < MAX_CONSOLE) consoleEntries.push({ type: "error", text: redactText(error.message) });
  });

  let mainResponse;
  try {
    mainResponse = await page.goto(target.toString(), { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
    await page.waitForTimeout(options.settleMs);
  } catch (error) {
    await context.close();
    await browser.close();
    throw error;
  }

  if (!mainResponse) throw new Error("The page did not return a main document response.");
  const finalUrl = page.url();
  await validateHost(new URL(finalUrl).hostname);
  const mainHeadersRaw = await mainResponse.allHeaders();
  const mainHeaders = Object.fromEntries(
    SECURITY_HEADERS.flatMap((name) => mainHeadersRaw[name] ? [[name, mainHeadersRaw[name]]] : []),
  );
  const cookies = (await context.cookies()).map((cookie) => ({
    name: cookie.name,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
  }));
  const pageDetails = await page.evaluate(() => ({
    title: document.title,
    scripts: document.scripts.length,
    inlineScripts: [...document.scripts].filter((script) => !script.src).length,
    iframes: document.querySelectorAll("iframe").length,
    forms: document.forms.length,
    images: document.images.length,
    links: document.links.length,
    localStorageKeys: Object.keys(localStorage),
    sessionStorageKeys: Object.keys(sessionStorage),
  }));

  requests.forEach((request) => {
    request.status = responseStatus.get(request.url);
  });
  const thirdPartyMap = new Map();
  requests.filter((request) => request.thirdParty).forEach((request) => {
    const current = thirdPartyMap.get(request.domain) || {
      domain: request.domain,
      requests: 0,
      resourceTypes: new Set(),
      trackerCategory: request.trackerCategory,
    };
    current.requests += 1;
    current.resourceTypes.add(request.resourceType);
    current.trackerCategory ||= request.trackerCategory;
    thirdPartyMap.set(request.domain, current);
  });
  const thirdParties = [...thirdPartyMap.values()]
    .map((item) => ({ ...item, resourceTypes: [...item.resourceTypes].sort() }))
    .sort((a, b) => b.requests - a.requests);

  const report = {
    schemaVersion: 1,
    source: "tracelattice-local-runtime",
    scanId: randomUUID(),
    scannerVersion: VERSION,
    targetUrl: target.toString(),
    finalUrl,
    rootDomain: rootDomainFor(new URL(finalUrl).hostname),
    title: pageDetails.title,
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedMs,
    browser: `Chromium ${browser.version()}`,
    summary: {
      requests: requests.length,
      thirdPartyDomains: thirdParties.length,
      trackerDomains: thirdParties.filter((item) => item.trackerCategory).length,
      cookies: cookies.length,
      webSockets: webSockets.size,
      consoleErrors: consoleEntries.filter((item) => item.type === "error").length,
      blockedRequests: blockedRequests.length,
    },
    page: {
      scripts: pageDetails.scripts,
      inlineScripts: pageDetails.inlineScripts,
      iframes: pageDetails.iframes,
      forms: pageDetails.forms,
      images: pageDetails.images,
      links: pageDetails.links,
    },
    mainResponse: {
      status: mainResponse.status(),
      headers: mainHeaders,
    },
    requests,
    thirdParties,
    cookies,
    storage: {
      localStorageKeys: pageDetails.localStorageKeys.slice(0, 100),
      sessionStorageKeys: pageDetails.sessionStorageKeys.slice(0, 100),
    },
    webSockets: [...webSockets].slice(0, 100),
    console: consoleEntries,
    failedRequests: failedRequests.slice(0, MAX_FAILURES),
    blockedRequests: blockedRequests.slice(0, MAX_FAILURES),
    findings: [],
    limitations: [
      "The local scanner observes one browser page load and a short settling window; it does not authenticate or interact with consent dialogs.",
      "Cookie values, storage values, response bodies, request bodies, and authorization headers are not collected.",
      "Runtime behavior can vary by region, browser state, consent, feature flags, and time.",
      "Findings are defensive observations, not proof of exploitability, compromise, or compliance.",
    ],
  };
  report.findings = buildFindings(report);
  await context.close();
  await browser.close();
  return report;
}

function outputPath(options, report) {
  if (options.output) return resolve(options.output);
  const stamp = report.startedAt.replace(/[:.]/g, "-");
  return resolve(`tracelattice-deep-${report.rootDomain}-${stamp}.json`);
}

function viewerUrl(viewer, report) {
  const json = JSON.stringify(report);
  const bytes = Buffer.byteLength(json);
  if (bytes > MAX_REPORT_BYTES) return null;
  const encoded = gzipSync(json).toString("base64url");
  return `${viewer}#report=${encoded}`;
}

function openUrl(url) {
  const command = process.platform === "win32"
    ? ["cmd.exe", ["/c", "start", "", url]]
    : process.platform === "darwin"
      ? ["open", [url]]
      : ["xdg-open", [url]];
  const child = spawn(command[0], command[1], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      usage();
      return;
    }
    if (!options.target) {
      usage();
      process.exitCode = 1;
      return;
    }

    console.log(`TraceLattice deep scan: ${options.target}`);
    console.log("Running an isolated local browser. No report data is uploaded.");
    const report = await runScan(options);
    const file = outputPath(options, report);
    await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`\nSaved: ${file}`);
    console.log(`Observed: ${report.summary.requests} requests, ${report.summary.thirdPartyDomains} third parties, ${report.summary.trackerDomains} tracker domains, ${report.findings.length} findings.`);

    const url = viewerUrl(options.viewer, report);
    if (options.open && url) {
      openUrl(url);
      console.log("Opened the private report in the TraceLattice web viewer.");
    } else if (options.open) {
      openUrl(options.viewer);
      console.log(`The report exceeded the private URL handoff limit. Import ${basename(file)} in the viewer.`);
    }
  } catch (error) {
    console.error(`\nDeep scan failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

await main();
