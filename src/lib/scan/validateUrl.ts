import { isIP } from "node:net";
import { resolve4, resolve6 } from "node:dns/promises";
import { parse as parseDomain } from "tldts";

const blockedHostnames = new Set(["localhost", "localhost.localdomain", "0.0.0.0", "127.0.0.1", "::1"]);

function ipv4ToNumber(ip: string) {
  return ip.split(".").reduce((sum, part) => (sum << 8) + Number(part), 0) >>> 0;
}

function inCidr(ip: string, base: string, bits: number) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(base) & mask);
}

export function isBlockedIp(ip: string) {
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
    ].some(([base, bits]) => inCidr(ip, base as string, bits as number));
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

export function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter a public website URL.");

  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("That URL is malformed. Try a public domain such as example.com.");
  }

  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS websites can be scanned.");
  if (url.username || url.password) throw new Error("URLs containing embedded credentials are not allowed.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only standard web ports 80 and 443 are allowed.");
  url.hash = "";
  return url;
}

export async function validatePublicUrl(input: string) {
  const url = normalizeUrl(input);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");

  if (blockedHostnames.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Private, local, and internal destinations cannot be scanned.");
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error("Private, reserved, and link-local IP addresses cannot be scanned.");
  } else {
    const parsed = parseDomain(hostname);
    if (!parsed.publicSuffix || !parsed.domain) throw new Error("Enter a public internet hostname with a valid suffix.");
  }

  const resolved = await Promise.allSettled([resolve4(hostname), resolve6(hostname)]);
  const addresses = resolved.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!addresses.length) throw new Error("The website hostname could not be resolved.");
  if (addresses.some(isBlockedIp)) throw new Error("The website resolves to a private or reserved network address.");

  return url;
}
