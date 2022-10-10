import { NextRequest, NextFetchEvent, NextResponse } from "next/server";
import { redis, recordClick } from "@/lib/upstash";
import { parse, detectBot } from "@/lib/middleware/utils";
import { LinkProps } from "../types";

export default async function LinkMiddleware(
  req: NextRequest,
  ev: NextFetchEvent
) {
  const url = req.nextUrl.clone();
  const { hostname, key } = parse(req);

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

    const noTrack = req.headers.get("dub-no-track");
    if (!noTrack) ev.waitUntil(recordClick(hostname, req, key)); // track the click only if there is no `dub-no-track` header

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
