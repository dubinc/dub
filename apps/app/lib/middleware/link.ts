import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { detectBot, parse } from "@/lib/middleware/utils";
import { recordClick, redis } from "@/lib/upstash";

export default async function LinkMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  const url = req.nextUrl.clone();
  const { domain, key } = parse(req);

  if (!domain || !key) {
    return NextResponse.next();
  }

  const response = await redis.get<{
    url: string;
    password?: boolean;
    proxy?: boolean;
  }>(`${domain}:${key}`);
  const { url: target, password, proxy } = response || {};

  if (target) {
    // special case for link health monitoring with planetfall.io :)
    if (!req.headers.get("dub-no-track")) {
      ev.waitUntil(recordClick(domain, req, key)); // track the click only if there is no `dub-no-track` header
    }

    if (password && !req.cookies.get("dub_authenticated")) {
      // rewrite to auth page (/_auth/[domain]/[key]) if the link is password protected and the user has not authenticated before
      return NextResponse.rewrite(new URL(`/_auth/${domain}/${key}`, req.url));
    }

    const isBot = detectBot(req);
    if (isBot && proxy) {
      // rewrite to proxy page (/_proxy/[domain]/[key]) if it's a bot
      return NextResponse.rewrite(new URL(`/_proxy/${domain}/${key}`, req.url));
    } else {
      return NextResponse.redirect(target);
    }
  } else {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
}
