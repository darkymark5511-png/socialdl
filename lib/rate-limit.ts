import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

const memoryStore = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQ = 3;

function memoryLimit(key: string): LimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const hits = (memoryStore.get(key) ?? []).filter((t) => t > windowStart);
  hits.push(now);
  memoryStore.set(key, hits);
  if (memoryStore.size > 10_000) {
    for (const [k, arr] of memoryStore) {
      const kept = arr.filter((t) => t > windowStart);
      if (kept.length === 0) memoryStore.delete(k);
      else memoryStore.set(k, kept);
    }
  }
  const remaining = Math.max(0, MAX_REQ - hits.length);
  return {
    success: hits.length <= MAX_REQ,
    remaining,
    reset: now + WINDOW_MS,
  };
}

let upstash: Ratelimit | null = null;

function getUpstash(): Ratelimit | null {
  if (upstash) return upstash;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const redis = new Redis({ url, token });
    upstash = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_REQ, "60 s"),
      analytics: false,
      prefix: "socialdl",
    });
    return upstash;
  } catch {
    return null;
  }
}

export async function rateLimit(identifier: string): Promise<LimitResult> {
  const limiter = getUpstash();
  if (limiter) {
    try {
      const res = await limiter.limit(identifier);
      return {
        success: res.success,
        remaining: res.remaining,
        reset: res.reset,
      };
    } catch {
      // fall through
    }
  }
  return memoryLimit(identifier);
}
