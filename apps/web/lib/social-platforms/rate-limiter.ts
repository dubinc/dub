import { redis } from "@/lib/upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// X API Pro tier: 300 requests per 15 minutes
// Use 280 to leave headroom
const xApiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(280, "15 m"),
  analytics: true,
  prefix: "x-api-rate-limit",
  timeout: 1000,
});

export async function checkXApiRateLimit() {
  return xApiRateLimiter.limit("global");
}
