import { NextRequest, NextFetchEvent, NextResponse } from "next/server";
import { redis, recordClick } from "@/lib/upstash";
import { parse } from "@/lib/middleware/utils";
import { LinkProps } from "../types";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export default async function LinkMiddleware(
  req: NextRequest,
  ev: NextFetchEvent
) {
  const url = req.nextUrl.clone();
  const { hostname, key } = parse(req);

  if (!hostname || !key) {
    return NextResponse.next();
  }

  const ip = req.ip ?? "127.0.0.1";
  const { success, limit, reset, remaining } = await ratelimit.limit(
    `dub_${ip}`
  );

  let res;

  if (success) {
    // if ratelimit is not exceeded
    const response = await redis.hget<Omit<LinkProps, "key">>(
      `${hostname}:links`,
      key
    );
    const target = response?.url;

    if (target) {
      ev.waitUntil(recordClick(hostname, key, req)); // increment click count
      res = NextResponse.redirect(target);
    } else {
      url.pathname = "/";
      res = NextResponse.redirect(url);
    }
  } else {
    url.pathname = "/";
    res = NextResponse.redirect(url); // TODO: add a rate limit page
    res.headers.set("X-RateLimit-Limit", limit.toString());
    res.headers.set("X-RateLimit-Remaining", remaining.toString());
    res.headers.set("X-RateLimit-Reset", reset.toString());
  }
  return res;
}
