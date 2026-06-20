const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;
const buckets = new Map<string, number[]>();
let lastSweep = 0;

export function rateLimit(key: string) {
  const now = Date.now();
  if (now - lastSweep > WINDOW_MS) {
    for (const [bucketKey, timestamps] of buckets) {
      const active = timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
      if (active.length) buckets.set(bucketKey, active);
      else buckets.delete(bucketKey);
    }
    lastSweep = now;
  }
  const recent = (buckets.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return false;
  recent.push(now);
  buckets.set(key, recent);
  return true;
}
