import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { recordClick, redis } from "@/lib/upstash";
import { parse } from "./utils";

export default async function RootMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  const { domain } = parse(req);

  if (!domain) {
    return NextResponse.next();
  }

  if (
    domain === "dub.sh" ||
    domain === "preview.dub.sh" ||
    domain.endsWith(".vercel.app")
  ) {
    ev.waitUntil(redis.incr("dub.sh:root:clicks")); // increment root clicks (only for dub.sh)
  } else {
    ev.waitUntil(recordClick(domain, req)); // record clicks on root page (if domain is not dub.sh)
  }

  if (
    domain === "dub.sh" ||
    domain === "preview.dub.sh" ||
    domain.endsWith(".vercel.app")
  ) {
    return NextResponse.next();
  } else {
    const target = await redis.get<string>(`root:${domain}`);
    if (target) {
      return NextResponse.redirect(target);
    } else {
      const url = req.nextUrl;
      url.pathname = `/placeholder/${domain}`; // rewrite to a /placeholder page unless the user defines a site to redirect to
      return NextResponse.rewrite(url);
    }
  }
}
