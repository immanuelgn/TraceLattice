import * as cheerio from "cheerio";
import type { ParsedHtml, ResourceFinding } from "./types";

export function parseHtml(html: string, baseUrl: string): ParsedHtml {
  const $ = cheerio.load(html);
  const resources: ParsedHtml["resources"] = [];
  const sameOriginLinks = new Set<string>();
  const base = new URL(baseUrl);

  const add = (type: ResourceFinding["type"], value?: string, metadata: Partial<Omit<ResourceFinding, "type" | "url" | "domain" | "thirdParty">> = {}) => {
    if (!value || value.startsWith("data:") || value.startsWith("javascript:") || value.startsWith("#")) return;
    try {
      resources.push({ type, url: new URL(value, baseUrl).toString(), ...metadata });
    } catch {
      // Ignore malformed static references.
    }
  };

  $("script[src]").each((_, el) => add("script", $(el).attr("src"), {
    integrity: Boolean($(el).attr("integrity")),
    crossOrigin: $(el).attr("crossorigin"),
  }));
  $("iframe[src]").each((_, el) => add("iframe", $(el).attr("src")));
  $("img[src]").slice(0, 100).each((_, el) => add("image", $(el).attr("src")));
  $("form").each((_, el) => {
    const $form = $(el);
    const action = $form.attr("action") || baseUrl;
    add("form", action, {
      inputTypes: $form.find("input").map((__, input) => ($(input).attr("type") || "text").toLowerCase()).get(),
      autocomplete: $form.attr("autocomplete") || null,
    });
  });
  $("a[href]").slice(0, 80).each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
    try {
      const url = new URL(href, baseUrl);
      url.hash = "";
      add("anchor", url.toString(), {
        rel: $(el).attr("rel") || "",
        target: $(el).attr("target") || "",
      });
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
      add("link", $(el).attr("href"), {
        rel,
        integrity: Boolean($(el).attr("integrity")),
        crossOrigin: $(el).attr("crossorigin"),
      });
    }
  });

  const refresh = $('meta[http-equiv="refresh" i]').attr("content")?.match(/url\s*=\s*([^;]+)/i)?.[1]?.trim();
  if (refresh) add("meta-refresh", refresh.replace(/^['"]|['"]$/g, ""));

  const inlineScriptText = $("script:not([src])").map((_, el) => $(el).html() || "").get().join("\n");
  const inlineScriptRiskMatches = inlineScriptText.match(/\b(eval|Function|setTimeout|setInterval)\s*\(|document\.write\s*\(|\.innerHTML\s*=|insertAdjacentHTML\s*\(|localStorage\.|sessionStorage\./gi) || [];
  const inlineEventHandlerCount = $("[onclick],[onload],[onerror],[onmouseover],[onfocus],[oninput],[onsubmit],[onchange]").length;

  return {
    resources: resources.slice(0, 400),
    sameOriginLinks: [...sameOriginLinks].slice(0, 20),
    inlineScriptCount: $("script:not([src])").length,
    externalScriptCount: $("script[src]").length,
    canonicalUrl: $('link[rel="canonical"]').attr("href"),
    inlineEventHandlerCount,
    inlineScriptRiskCount: inlineScriptRiskMatches.length,
  };
}
