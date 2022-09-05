import {
  NextRequest,
  NextFetchEvent,
  NextResponse,
  userAgent,
} from "next/server";
import { redis } from "@/lib/redis";
import { LOCALHOST_GEO_DATA } from "@/lib/constants";
import { parse } from "@/lib/middleware/utils";

export default async function LinkMiddleware(
  req: NextRequest,
  ev: NextFetchEvent
) {
  const { hostname, key } = parse(req);

  const target = await redis.hget<string>(`${hostname}:links`, key);
  if (target) {
    ev.waitUntil(
      redis.zadd(`${hostname}:${key}:clicks`, {
        score: Date.now(),
        member: {
          geo: process.env.VERCEL === "1" ? req.geo : LOCALHOST_GEO_DATA,
          ua: userAgent(req),
          timestamp: Date.now(),
        },
      })
    ); // increment click count
    return NextResponse.redirect(target);
  } else {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
}
