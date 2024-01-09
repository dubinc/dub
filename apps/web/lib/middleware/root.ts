import { recordClick } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { DUB_HEADERS } from "@dub/utils";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { getFinalUrl, parse } from "./utils";

export default async function RootMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  const { domain } = parse(req);

  if (!domain) {
    return NextResponse.next();
  }

  const response = await redis.get<{
    id?: string;
    target?: string;
    rewrite?: boolean;
    iframeable?: boolean;
    projectId?: string;
  }>(`root:${domain}`);

  const { id, target, rewrite, iframeable, projectId } = response || {};

  const searchParams = req.nextUrl.searchParams;
  // only track the click when:
  // - the `dub-no-track` header is not set
  // - the `__dub_no_track` query param is not set
  if (
    !(
      req.headers.get("dub-no-track") ||
      searchParams.get("__dub_no_track") === "1"
    )
  ) {
    ev.waitUntil(
      recordClick({
        req,
        domain,
        url: target ? getFinalUrl(target, { req }) : undefined,
        id,
        projectId,
      }),
    );
  }

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
