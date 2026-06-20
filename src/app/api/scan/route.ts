import { NextRequest } from "next/server";
import { getDomain } from "tldts";
import { analyzeCookies } from "@/lib/scan/analyzeCookies";
import { analyzeHeaders } from "@/lib/scan/analyzeHeaders";
import { detectTrackers } from "@/lib/scan/detectTrackers";
import { analyzePosture } from "@/lib/scan/analyzePosture";
import { extractThirdParties } from "@/lib/scan/extractThirdParties";
import { fetchWebsite } from "@/lib/scan/fetchWebsite";
import { parseHtml } from "@/lib/scan/parseHtml";
import { rateLimit } from "@/lib/scan/rateLimit";
import { buildRecommendations } from "@/lib/scan/recommendations";
import { renderPublicPageWithBrowser } from "@/lib/scan/renderWithBrowser";
import { scorePrivacy } from "@/lib/scan/scorePrivacy";
import { normalizeUrl } from "@/lib/scan/validateUrl";
import type { ScanReport } from "@/lib/scan/types";

export const runtime = "nodejs";
export const maxDuration = 25;

const MAX_EXTRA_PAGES = 2;
const SKIP_PATH = /(login|log-in|signin|sign-in|logout|log-out|signout|sign-out|delete|remove|cart|checkout|admin|account|settings|billing)/i;

function errorResponse(message: string, requestId: string, status = 400) {
  return Response.json(
    {
      error: message,
      requestId,
      retryable: status === 429 || status >= 500,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-TraceLattice-Request-Id": requestId,
      },
    },
  );
}

function statusForError(message: string) {
  if (/Enhanced scan is not configured/i.test(message)) return 503;
  if (/did not respond within/i.test(message)) return 504;
  if (/could not be reached|temporarily unavailable|could not render JavaScript/i.test(message)) return 502;
  if (/HTML document|empty response|too large|1\.5 MB/i.test(message)) return 422;
  return 400;
}

async function fetchExtraPages(candidates: string[], finalOrigin: string, finalUrl: string) {
  const unique = [...new Set(candidates)]
    .filter((url) => url !== finalUrl)
    .filter((url) => {
      const parsed = new URL(url);
      return parsed.origin === finalOrigin && !SKIP_PATH.test(parsed.pathname);
    })
    .slice(0, MAX_EXTRA_PAGES);

  const settled = await Promise.allSettled(unique.map(async (url) => {
    const fetched = await fetchWebsite(url);
    const final = new URL(fetched.finalUrl);
    if (final.origin !== finalOrigin) throw new Error("Skipped cross-origin crawl result.");
    if (SKIP_PATH.test(final.pathname)) throw new Error("Skipped sensitive same-origin crawl result.");
    return { fetched, parsed: parseHtml(fetched.html, fetched.finalUrl) };
  }));

  return settled.flatMap((item) => item.status === "fulfilled" ? [item.value] : []);
}

function enhanceScore(baseScore: ReturnType<typeof scorePrivacy>) {
  return {
    ...baseScore,
    confidence: "moderate" as const,
    scopeNote: "Enhanced mode renders the public page once in a hosted browser before analysis. It still does not log in, click, submit forms, bypass consent screens, or capture private user data.",
    summary: baseScore.summary.replaceAll("static ", "observed ").replaceAll("static-analysis", "bounded-analysis"),
    positiveNotes: baseScore.positiveNotes.map((note) => note.replaceAll("static references", "observed references")),
    components: {
      ...baseScore.components,
      exposure: {
        ...baseScore.components.exposure,
        reasons: baseScore.components.exposure.reasons.map((reason) => reason.replaceAll("Static references", "Observed references").replaceAll("static HTML", "the observed page")),
      },
    },
  };
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
  if (!rateLimit(ip)) return errorResponse("Scan limit reached. Try again in a few minutes.", requestId, 429);

  const startedAt = Date.now();
  try {
    const body = await request.json();
    if (typeof body?.url !== "string" || body.url.length > 2_048) {
      return errorResponse("Provide a valid website URL.", requestId);
    }

    const enhancedRequested = body?.mode === "enhanced" || body?.enhanced === true;
    const normalizedUrl = normalizeUrl(body.url).toString();
    const fetched = await fetchWebsite(normalizedUrl);
    const rendered = enhancedRequested ? await renderPublicPageWithBrowser(fetched.finalUrl) : null;
    const primaryUrl = rendered?.finalUrl || fetched.finalUrl;
    const parsed = parseHtml(rendered?.html || fetched.html, primaryUrl);
    const final = new URL(primaryUrl);
    const extraPages = await fetchExtraPages(parsed.sameOriginLinks, final.origin, primaryUrl);
    const combinedParsed = {
      resources: [
        ...parsed.resources,
        ...extraPages.flatMap((page) => page.parsed.resources),
      ].slice(0, 800),
      sameOriginLinks: parsed.sameOriginLinks,
      inlineScriptCount: parsed.inlineScriptCount + extraPages.reduce((sum, page) => sum + page.parsed.inlineScriptCount, 0),
      externalScriptCount: parsed.externalScriptCount + extraPages.reduce((sum, page) => sum + page.parsed.externalScriptCount, 0),
      canonicalUrl: parsed.canonicalUrl,
      inlineEventHandlerCount: parsed.inlineEventHandlerCount + extraPages.reduce((sum, page) => sum + page.parsed.inlineEventHandlerCount, 0),
      inlineScriptRiskCount: parsed.inlineScriptRiskCount + extraPages.reduce((sum, page) => sum + page.parsed.inlineScriptRiskCount, 0),
    };
    const inspectedUrls = [primaryUrl, ...extraPages.map((page) => page.fetched.finalUrl)];
    const { resources, thirdParties } = extractThirdParties(combinedParsed, primaryUrl);
    const headers = analyzeHeaders(fetched.headers);
    const cookies = analyzeCookies([...fetched.setCookieHeaders, ...extraPages.flatMap((page) => page.fetched.setCookieHeaders)]);
    const trackers = detectTrackers(resources);
    const rootDomain = getDomain(final.hostname, { allowPrivateDomains: true }) || final.hostname;
    const crossDomainMetaRefresh = resources.some((resource) => resource.type === "meta-refresh" && resource.thirdParty);
    const posture = await analyzePosture({
      finalUrl: primaryUrl,
      rootDomain,
      resources,
      inlineScriptCount: combinedParsed.inlineScriptCount,
      inlineEventHandlerCount: combinedParsed.inlineEventHandlerCount,
      inlineScriptRiskCount: combinedParsed.inlineScriptRiskCount,
    });
    const baseScore = scorePrivacy({
      https: final.protocol === "https:",
      redirectsToHttps: fetched.redirectsToHttps,
      headers,
      cookies,
      trackers,
      thirdPartyCount: thirdParties.length,
      externalScriptCount: combinedParsed.externalScriptCount,
      thirdPartyScriptCount: resources.filter((resource) => resource.thirdParty && resource.type === "script").length,
      functionalThirdPartyCount: thirdParties.filter((party) => party.category === "CDN / functional").length,
      unknownThirdPartyCount: thirdParties.filter((party) => party.category === "Unknown").length,
      crossDomainMetaRefresh,
      postureFindings: posture,
    });
    const score = rendered ? enhanceScore(baseScore) : baseScore;

    const report: ScanReport = {
      source: rendered ? {
        kind: "enhanced",
        label: "Enhanced hosted-browser scan",
        description: "Generated from public response signals plus a Cloudflare hosted-browser render of the page. No logins, clicks, form submissions, or user cookies are used.",
      } : {
        kind: "live",
        label: "Live public-origin scan",
        description: "Generated from the bounded public signals observed during this request.",
      },
      scanId: crypto.randomUUID(),
      inputUrl: body.url,
      normalizedUrl,
      finalUrl: primaryUrl,
      inspectedUrls,
      domain: final.hostname,
      rootDomain,
      scannedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      statusCode: fetched.statusCode,
      https: {
        enabled: final.protocol === "https:",
        redirectsToHttps: fetched.redirectsToHttps,
        risk: final.protocol === "https:" ? "low" : "high",
        notes: final.protocol === "https:" ? ["Final response used HTTPS."] : ["Final response did not use HTTPS."],
      },
      score,
      headers,
      cookies,
      trackers,
      thirdParties,
      posture,
      resources,
      inlineScriptCount: combinedParsed.inlineScriptCount,
      externalScriptCount: combinedParsed.externalScriptCount,
      recommendations: buildRecommendations(headers, cookies, trackers, thirdParties.length, posture),
      limitations: rendered ? [
        "Enhanced mode renders the public page once through a hosted browser API before analysis.",
        "No authentication, user cookies, form submission, clicking, consent bypass, or private browsing data is used.",
        "At most two additional same-origin HTML pages are fetched from ordinary links.",
        "Only rendered HTML/resource references returned by the provider are analyzed; full browser network bodies are not collected.",
        "Consent-dependent, authenticated, delayed, regional, or interaction-only behavior may still be missed.",
        "No broad crawling, exploitation, brute force, or compliance determination is performed.",
        "Scores are deterministic educational heuristics, not legal or audit conclusions.",
      ] : [
        "Bounded public-origin scan only; no JavaScript is executed.",
        "At most two additional same-origin HTML pages are fetched from ordinary links.",
        "Referenced JavaScript and CSS are inventoried from HTML attributes, but their code is not executed.",
        "Dynamic trackers and consent-dependent resources may not be visible.",
        "No broad crawling, authentication, exploitation, brute force, or compliance determination is performed.",
        "Scores are deterministic educational heuristics, not legal or audit conclusions.",
      ],
    };

    return Response.json(report, {
      headers: {
        "Cache-Control": "no-store",
        "X-TraceLattice-Request-Id": requestId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The website could not be scanned.";
    return errorResponse(message, requestId, statusForError(message));
  }
}
