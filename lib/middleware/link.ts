import { NextRequest, NextFetchEvent, NextResponse } from "next/server";
import { redis, recordClick } from "@/lib/upstash";
import { parse, detectBot } from "@/lib/middleware/utils";
import { LinkProps } from "../types";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"),
});

export default async function LinkMiddleware(
  req: NextRequest,
  ev: NextFetchEvent
) {
  const url = req.nextUrl.clone();
  const { hostname, key, query } = parse(req);

  if (!hostname || !key) {
    return NextResponse.next();
  }

  const response = await redis.hget<Omit<LinkProps, "key">>(
    `${hostname}:links`,
    key
  );
  const { url: target, description, image } = response || {};

  if (target) {
    const isBot = detectBot(req);

    ev.waitUntil(recordClick(hostname, req, query, key)); // increment click count

    if (image && description && isBot) {
      // rewrite to proxy page (dub.sh/proxy/[domain]/[key])
      return NextResponse.rewrite(`https://dub.sh/proxy/${hostname}/${key}`);
    } else {
      return NextResponse.redirect(target);
    }
  } else {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
}
