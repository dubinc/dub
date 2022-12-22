import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/upstash";
import { HOME_HOSTNAMES } from "@/lib/constants";
import { recordClick } from "@/lib/tinybird";
import { parse } from "./utils";
import { RootDomainProps } from "../types";

export default async function RootMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  const { domain } = parse(req);

  if (!domain) {
    return NextResponse.next();
  }

  if (!HOME_HOSTNAMES.has(domain) && !domain.endsWith(".vercel.app")) {
    ev.waitUntil(recordClick(domain, req)); // record clicks on root page (if domain is not dub.sh)
  }

  if (
    domain === "dub.sh" ||
    domain === "preview.dub.sh" ||
    domain.endsWith(".vercel.app")
  ) {
    return NextResponse.next();
  } else {
    const { target, rewrite } =
      (await redis.get<RootDomainProps>(`root:${domain}`)) || {};
    if (target) {
      if (rewrite) {
        return NextResponse.rewrite(target);
      } else {
        return NextResponse.redirect(target);
      }
    } else {
      // rewrite to a /placeholder page unless the user defines a site to redirect to
      return NextResponse.rewrite(new URL(`/placeholder/${domain}`, req.url));
    }
  }
}
