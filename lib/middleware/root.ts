import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { redis } from "#/lib/upstash";
import { recordClick } from "#/lib/tinybird";
import { parse } from "./utils";
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

  const response = await redis.get<{
    target: string;
    rewrite?: boolean;
    iframeable?: boolean;
  }>(`root:${domain}`);

  const { target, rewrite, iframeable } = response || {};

  if (target) {
    if (rewrite) {
      if (iframeable) {
        // note: there's a discrepancy between the implementation here and for
        // link rewriting in `lib/api/links` – here we do `encodeURIComponent` but for links we
        // don't need to. This is because link targets are already encoded, while root targets
        // are not. TODO: standardize this in the future.
        return NextResponse.rewrite(
          new URL(`/rewrite/${encodeURIComponent(target)}`, req.url),
          DUB_HEADERS,
        );
      } else {
        // if link is not iframeable, use Next.js rewrite instead
        return NextResponse.rewrite(target, DUB_HEADERS);
      }
    } else {
      return NextResponse.redirect(target, DUB_HEADERS);
    }
  } else {
    // rewrite to root page unless the user defines a site to redirect to
    return NextResponse.rewrite(new URL(`/${domain}`, req.url));
  }
}
