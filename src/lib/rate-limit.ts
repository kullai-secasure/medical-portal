// Minimal in-memory sliding-window rate limiter. This is process-local — fine
// for a single-instance deployment, but it will NOT coordinate limits across
// multiple server instances/regions. For a multi-instance production
// deployment, swap this for a shared store (e.g. @upstash/ratelimit backed by
// Redis) behind the same `checkRateLimit` signature.

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

// Periodically drop stale buckets so this Map doesn't grow unbounded.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > windowMs) buckets.delete(key);
  }
}

/**
 * Returns true if `key` is still within its rate limit; false if the request
 * should be rejected. Each call counts as one attempt.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}
