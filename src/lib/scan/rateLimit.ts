const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;
const buckets = new Map<string, number[]>();

export function rateLimit(key: string) {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return false;
  recent.push(now);
  buckets.set(key, recent);
  return true;
}
