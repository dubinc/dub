import {
  NextRequest,
  NextFetchEvent,
  NextResponse,
  userAgent,
} from "next/server";
import { redis } from "@/lib/redis";
import { LOCALHOST_GEO_DATA } from "@/lib/constants";

export const config = {
  matcher: "/([^/.]*)",
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  let hostname = req.headers.get("host");
  if (hostname === "localhost:3000") hostname = "dub.sh";

  const path = req.nextUrl.pathname;
  const key = path.split("/")[1];
  if (hostname === "dub.sh" && key.length === 0) {
    return NextResponse.next();
  } // skip root

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
