import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { recordClick, redis } from "@dub/lib/upstash";
import { parse } from "./utils";

export default async function RootMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  const { domain } = parse(req);

  if (!domain) {
    return NextResponse.next();
  }

  ev.waitUntil(recordClick(domain, req)); // record clicks on root page (if domain is not dub.sh)

  const target = await redis.get<string>(`root:${domain}`);
  if (target) {
    return NextResponse.redirect(target);
  } else {
    return NextResponse.next();
  }
}
