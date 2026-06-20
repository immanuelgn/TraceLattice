import { validatePublicUrl } from "./validateUrl";

const MAX_RENDERED_HTML_BYTES = 1_500_000;
const RENDER_TIMEOUT_MS = 18_000;

export interface HostedBrowserRenderResult {
  html: string;
  finalUrl: string;
  provider: "cloudflare";
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function cloudflareContentEndpoint(accountId: string) {
  const customEndpoint = process.env.CLOUDFLARE_BROWSER_RENDER_ENDPOINT?.trim();
  if (customEndpoint) return customEndpoint.replace("{accountId}", encodeURIComponent(accountId));
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/browser-rendering/content`;
}

function maybeJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function objectValue(value: unknown, key: string) {
  return value && typeof value === "object" && key in value ? (value as Record<string, unknown>)[key] : undefined;
}

function pickHtml(value: unknown): string | null {
  if (typeof value === "string") return value;
  const result = objectValue(value, "result");
  const candidates = [
    objectValue(result, "content"),
    objectValue(result, "html"),
    objectValue(result, "body"),
    result,
    objectValue(value, "content"),
    objectValue(value, "html"),
    objectValue(value, "body"),
  ];
  return candidates.find((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0) || null;
}

function pickFinalUrl(value: unknown) {
  const result = objectValue(value, "result");
  const candidates = [
    objectValue(result, "url"),
    objectValue(result, "finalUrl"),
    objectValue(result, "final_url"),
    objectValue(value, "url"),
    objectValue(value, "finalUrl"),
    objectValue(value, "final_url"),
  ];
  return candidates.find((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0);
}

export async function renderPublicPageWithBrowser(input: string): Promise<HostedBrowserRenderResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    throw new Error("Enhanced scan is not configured yet. Use Standard scan, or set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN on the deployment.");
  }

  const url = await validatePublicUrl(input);
  const endpoint = cloudflareContentEndpoint(accountId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("render-timeout"), RENDER_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: url.toString() }),
      signal: controller.signal,
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`Enhanced scan could not render JavaScript (provider HTTP ${response.status}).`);
    }

    const parsed = maybeJson(raw);
    const html = pickHtml(parsed ?? raw);
    if (!html || !/(<html|<!doctype)/i.test(html)) {
      throw new Error("Enhanced scan did not receive a rendered HTML document from the hosted browser.");
    }
    if (byteLength(html) > MAX_RENDERED_HTML_BYTES) {
      throw new Error("Enhanced rendered HTML response is too large for this bounded scanner (1.5 MB limit).");
    }

    const providerFinalUrl = parsed ? pickFinalUrl(parsed) : undefined;
    let finalUrl = url.toString();
    if (providerFinalUrl) {
      try {
        finalUrl = (await validatePublicUrl(providerFinalUrl)).toString();
      } catch {
        finalUrl = url.toString();
      }
    }

    return { html, finalUrl, provider: "cloudflare" };
  } catch (error) {
    if (controller.signal.reason === "render-timeout") {
      throw new Error("Enhanced scan did not respond within the hosted browser time limit.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
