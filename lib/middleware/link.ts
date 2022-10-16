import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { detectBot, parse } from "@/lib/middleware/utils";
import { recordClick, redis } from "@/lib/upstash";
import { LinkProps } from "../types";

export default async function LinkMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  const url = req.nextUrl.clone();
  const { hostname, key } = parse(req);

  if (!hostname || !key) {
    return NextResponse.next();
  }

  const response = await redis.get<{ url: string; password?: boolean }>(
    `${hostname}:${key}`,
  );
  const { url: target, password } = response || {};

  if (target) {
    if (password) {
      return NextResponse.rewrite(`https://dub.sh/auth/${hostname}/${key}`);
    }

    // special case for link health monitoring with planetfall.io :)
    if (!req.headers.get("dub-no-track")) {
      ev.waitUntil(recordClick(hostname, req, key)); // track the click only if there is no `dub-no-track` header
    }

    const isBot = detectBot(req);
    if (isBot) {
      // rewrite to proxy page (dub.sh/proxy/[domain]/[key]) if it's a bot
      return NextResponse.rewrite(`https://dub.sh/proxy/${hostname}/${key}`);
    } else {
      return NextResponse.redirect(target);
    }
  } else {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
}
