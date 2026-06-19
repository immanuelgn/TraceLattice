import * as cheerio from "cheerio";
import type { ParsedHtml, ResourceFinding } from "./types";

export function parseHtml(html: string, baseUrl: string): ParsedHtml {
  const $ = cheerio.load(html);
  const resources: ParsedHtml["resources"] = [];
  const sameOriginLinks = new Set<string>();
  const base = new URL(baseUrl);

  const add = (type: ResourceFinding["type"], value?: string) => {
    if (!value || value.startsWith("data:") || value.startsWith("javascript:") || value.startsWith("#")) return;
    try {
      resources.push({ type, url: new URL(value, baseUrl).toString() });
    } catch {
      // Ignore malformed static references.
    }
  };

  $("script[src]").each((_, el) => add("script", $(el).attr("src")));
  $("iframe[src]").each((_, el) => add("iframe", $(el).attr("src")));
  $("img[src]").slice(0, 100).each((_, el) => add("image", $(el).attr("src")));
  $("form[action]").each((_, el) => add("form", $(el).attr("action")));
  $("a[href]").slice(0, 80).each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
    try {
      const url = new URL(href, baseUrl);
      url.hash = "";
      if (url.origin === base.origin && !/\.(?:pdf|zip|png|jpe?g|gif|webp|svg|ico|mp4|mp3|css|js)$/i.test(url.pathname)) {
        sameOriginLinks.add(url.toString());
      }
    } catch {
      // Ignore malformed anchor references.
    }
  });
  $("link[href]").each((_, el) => {
    const rel = ($(el).attr("rel") || "").toLowerCase();
    if (["stylesheet", "preconnect", "dns-prefetch", "preload", "modulepreload", "canonical"].some((item) => rel.includes(item))) {
      add("link", $(el).attr("href"));
    }
  });

  const refresh = $('meta[http-equiv="refresh" i]').attr("content")?.match(/url\s*=\s*([^;]+)/i)?.[1]?.trim();
  if (refresh) add("meta-refresh", refresh.replace(/^['"]|['"]$/g, ""));

  return {
    resources: resources.slice(0, 400),
    sameOriginLinks: [...sameOriginLinks].slice(0, 20),
    inlineScriptCount: $("script:not([src])").length,
    externalScriptCount: $("script[src]").length,
    canonicalUrl: $('link[rel="canonical"]').attr("href"),
  };
}
