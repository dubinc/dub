import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { redis } from "#/lib/upstash";
import { recordClick } from "#/lib/tinybird";
import { parse } from "./utils";
import { RootDomainProps } from "../types";
import { DUB_HEADERS } from "#/lib/constants";

export default async function RootMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  const { domain } = parse(req);

  if (!domain) {
    return NextResponse.next();
  }

  // record clicks on root page
  ev.waitUntil(recordClick(domain, req));

  const { target, rewrite } =
    (await redis.get<RootDomainProps>(`root:${domain}`)) || {};
  if (target) {
    if (rewrite) {
      return NextResponse.rewrite(target);
    } else {
      return NextResponse.redirect(target, DUB_HEADERS);
    }
  } else {
    // rewrite to root page unless the user defines a site to redirect to
    return NextResponse.rewrite(new URL(`/${domain}`, req.url));
  }
}
