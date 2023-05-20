import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/upstash";
import { recordClick } from "@/lib/tinybird";
import { parse } from "./utils";
import { RootDomainProps } from "../types";
import { isHomeHostname } from "../utils";
import { REDIRECT_HEADERS } from "../constants";

export default async function RootMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  const { domain } = parse(req);

  if (!domain) {
    return NextResponse.next();
  }

  if (isHomeHostname(domain)) {
    return NextResponse.rewrite(new URL(`/dub.sh`, req.url));
  } else {
    ev.waitUntil(recordClick(domain, req)); // record clicks on root page (if domain is not dub.sh)

    const { target, rewrite } =
      (await redis.get<RootDomainProps>(`root:${domain}`)) || {};
    if (target) {
      if (rewrite) {
        return NextResponse.rewrite(target);
      } else {
        return NextResponse.redirect(target, REDIRECT_HEADERS);
      }
    } else {
      // rewrite to root page unless the user defines a site to redirect to
      return NextResponse.rewrite(new URL(`/${domain}`, req.url));
    }
  }
}
