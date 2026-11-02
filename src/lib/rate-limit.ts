/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Buckets live in process memory, which is fine for a single Next.js instance.
 * For multi-instance/horizontal deployments, swap this for a Redis-backed
 * limiter (e.g. @upstash/ratelimit) using the same API shape.
 */

type Bucket = { count: number; resetAt: number };

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 10;

// Bound the map so a flood of unique keys (e.g. spoofed IPs) cannot grow
// process memory without limit.
const MAX_BUCKETS = 10_000;

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size <= MAX_BUCKETS) return;
  // Still full of live buckets: evict oldest-inserted entries first.
  const overflow = buckets.size - MAX_BUCKETS;
  let removed = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    if (++removed >= overflow) break;
  }
}

export type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  options: { limit?: number; windowMs?: number } = {},
): RateLimitResult {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();

  if (buckets.size >= MAX_BUCKETS) prune(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/**
 * Best-effort client IP from common proxy headers.
 *
 * Prefer headers that a reverse proxy overwrites (Cloudflare, Vercel/nginx
 * `x-real-ip`) before `x-forwarded-for`, whose leading value is client-supplied
 * when the app is exposed directly. This makes rate-limit keys harder to spoof.
 */
export function clientIp(request: Request): string {
  const direct =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-real-ip");
  if (direct?.trim()) return direct.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}