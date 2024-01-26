import { recordClick } from "@/lib/tinybird";
import { formatRedisDomain, redis } from "@/lib/upstash";
import { DUB_HEADERS } from "@dub/utils";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { parse } from "./utils";
import { RedisDomainProps } from "../types";
import { getDomainViaEdge } from "../planetscale";

export default async function RootMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  const { domain } = parse(req);

  if (!domain) {
    return NextResponse.next();
  }

  let link = await redis.hget<RedisDomainProps>(domain, "_root");

  if (!link) {
    const linkData = await getDomainViaEdge(domain);

    if (!linkData) {
      // short link not found, redirect to root
      return NextResponse.redirect(new URL("/", req.url), DUB_HEADERS);
    }

    // format link to fit the RedisLinkProps interface
    link = await formatRedisDomain(linkData as any);

    ev.waitUntil(
      redis.hset(domain, {
        _root: link,
      }),
    );
  }

  const { id, url, rewrite, iframeable, projectId } = link;

  // record clicks on root page
  ev.waitUntil(recordClick({ req, id, domain, projectId }));

  if (url) {
    if (rewrite) {
      if (iframeable) {
        return NextResponse.rewrite(
          new URL(`/rewrite/${url}`, req.url),
          DUB_HEADERS,
        );
      } else {
        // if link is not iframeable, use Next.js rewrite instead
        return NextResponse.rewrite(url, DUB_HEADERS);
      }
    } else {
      return NextResponse.redirect(url, DUB_HEADERS);
    }
  } else {
    // rewrite to root page unless the user defines a site to redirect to
    return NextResponse.rewrite(new URL(`/${domain}`, req.url));
  }
}
