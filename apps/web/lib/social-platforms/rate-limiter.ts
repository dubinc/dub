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

// YouTube Data API v3: 10,000 units/day default quota
// Budget 5,000 units/day for engagement sync (reserve rest for channel stats cron + headroom)
// playlistItems.list = 1 unit, videos.list = 1 unit → ~2-3 units per partner
// see: https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits
const youtubeApiQuotaLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5000, "1 d"),
  analytics: true,
  prefix: "yt-api-quota",
  timeout: 1000,
});

export async function checkXApiRateLimit() {
  return xApiRateLimiter.limit("global");
}

export async function checkYouTubeApiQuota(cost: number) {
  return youtubeApiQuotaLimiter.limit("global", { rate: cost });
}
