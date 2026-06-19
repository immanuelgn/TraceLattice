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
import { scorePrivacy } from "@/lib/scan/scorePrivacy";
import { normalizeUrl } from "@/lib/scan/validateUrl";
import type { ScanReport } from "@/lib/scan/types";

export const runtime = "nodejs";
export const maxDuration = 25;

const MAX_EXTRA_PAGES = 2;
const SKIP_PATH = /(logout|log-out|signout|sign-out|delete|remove|cart|checkout|admin|account|settings|billing)/i;

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
    return { fetched, parsed: parseHtml(fetched.html, fetched.finalUrl) };
  }));

  return settled.flatMap((item) => item.status === "fulfilled" ? [item.value] : []);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
  if (!rateLimit(ip)) return Response.json({ error: "Scan limit reached. Try again in a few minutes." }, { status: 429 });

  const startedAt = Date.now();
  try {
    const body = await request.json();
    if (typeof body?.url !== "string" || body.url.length > 2_048) {
      return Response.json({ error: "Provide a valid website URL." }, { status: 400 });
    }

    const normalizedUrl = normalizeUrl(body.url).toString();
    const fetched = await fetchWebsite(normalizedUrl);
    const parsed = parseHtml(fetched.html, fetched.finalUrl);
    const final = new URL(fetched.finalUrl);
    const extraPages = await fetchExtraPages(parsed.sameOriginLinks, final.origin, fetched.finalUrl);
    const combinedParsed = {
      resources: [
        ...parsed.resources,
        ...extraPages.flatMap((page) => page.parsed.resources),
      ].slice(0, 800),
      sameOriginLinks: parsed.sameOriginLinks,
      inlineScriptCount: parsed.inlineScriptCount + extraPages.reduce((sum, page) => sum + page.parsed.inlineScriptCount, 0),
      externalScriptCount: parsed.externalScriptCount + extraPages.reduce((sum, page) => sum + page.parsed.externalScriptCount, 0),
      canonicalUrl: parsed.canonicalUrl,
    };
    const inspectedUrls = [fetched.finalUrl, ...extraPages.map((page) => page.fetched.finalUrl)];
    const { resources, thirdParties } = extractThirdParties(combinedParsed, fetched.finalUrl);
    const headers = analyzeHeaders(fetched.headers);
    const cookies = analyzeCookies([...fetched.setCookieHeaders, ...extraPages.flatMap((page) => page.fetched.setCookieHeaders)]);
    const trackers = detectTrackers(resources);
    const rootDomain = getDomain(final.hostname, { allowPrivateDomains: true }) || final.hostname;
    const crossDomainMetaRefresh = resources.some((resource) => resource.type === "meta-refresh" && resource.thirdParty);
    const posture = await analyzePosture({
      finalUrl: fetched.finalUrl,
      rootDomain,
      resources,
      inlineScriptCount: combinedParsed.inlineScriptCount,
    });
    const score = scorePrivacy({
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

    const report: ScanReport = {
      scanId: crypto.randomUUID(),
      inputUrl: body.url,
      normalizedUrl,
      finalUrl: fetched.finalUrl,
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
      limitations: [
        "Bounded public-origin scan only; no JavaScript is executed.",
        "At most two additional same-origin HTML pages are fetched from ordinary links.",
        "Dynamic trackers and consent-dependent resources may not be visible.",
        "No broad crawling, authentication, exploitation, brute force, or compliance determination is performed.",
        "Scores are deterministic educational heuristics, not legal or audit conclusions.",
      ],
    };

    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The website could not be scanned.";
    return Response.json({ error: message }, { status: 400 });
  }
}
