import { validatePublicUrl } from "./validateUrl";

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

export interface FetchResult {
  finalUrl: string;
  statusCode: number;
  headers: Headers;
  setCookieHeaders: string[];
  html: string;
  redirectsToHttps: boolean;
}

function getSetCookies(headers: Headers) {
  const withMethod = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withMethod.getSetCookie === "function") return withMethod.getSetCookie();
  const combined = headers.get("set-cookie");
  return combined ? [combined] : [];
}

export async function fetchWebsite(input: string): Promise<FetchResult> {
  let current = await validatePublicUrl(input);
  const startedOnHttp = current.protocol === "http:";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);

  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent": "TraceLatticeBot/1.0 DefensiveSecurityReview",
          Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.4",
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("The website returned an invalid redirect.");
        if (redirects === MAX_REDIRECTS) throw new Error("The website redirected too many times.");
        current = await validatePublicUrl(new URL(location, current).toString());
        continue;
      }

      const type = response.headers.get("content-type") || "";
      if (!type.includes("text/html") && !type.includes("application/xhtml+xml") && !type.includes("text/plain")) {
        throw new Error("The homepage did not return an HTML document.");
      }

      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength > MAX_BYTES) throw new Error("The homepage response is too large for this lightweight scan.");
      if (!response.body) throw new Error("The website returned an empty response.");

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel();
          throw new Error("The homepage response exceeded the 1.5 MB scan limit.");
        }
        chunks.push(value);
      }

      const bytes = new Uint8Array(total);
      let offset = 0;
      chunks.forEach((chunk) => {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      });

      return {
        finalUrl: current.toString(),
        statusCode: response.status,
        headers: response.headers,
        setCookieHeaders: getSetCookies(response.headers),
        html: new TextDecoder().decode(bytes),
        redirectsToHttps: !startedOnHttp || current.protocol === "https:",
      };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("The website did not respond within nine seconds.");
    if (error instanceof TypeError || (error instanceof Error && /fetch failed|network/i.test(error.message))) {
      throw new Error("The website could not be reached. It may block automated requests or be temporarily unavailable.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  throw new Error("The website could not be scanned.");
}
