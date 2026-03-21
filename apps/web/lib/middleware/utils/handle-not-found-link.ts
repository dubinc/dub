import { linkCache } from "@/lib/api/links/cache";
import { getDomainViaEdge } from "@/lib/planetscale/get-domain-via-edge";
import { DUB_HEADERS } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "./parse";

export const handleNotFoundLink = async (req: NextRequest) => {
  const { domain, key } = parse(req);

  let response: NextResponse;
  // check if domain has notFoundUrl configured
  const domainData = await getDomainViaEdge(domain);
  if (domainData?.notFoundUrl) {
    response = NextResponse.redirect(domainData.notFoundUrl, {
      headers: {
        ...DUB_HEADERS,
        "X-Robots-Tag": "googlebot: noindex",
        // pass the Referer [sic] value to the not found URL
        Referer: req.url,
      },
      status: 302,
    });
  } else {
    response = NextResponse.rewrite(new URL(`/${domain}/not-found`, req.url), {
      headers: DUB_HEADERS,
    });
  }
  response.headers.set("Vercel-CDN-Cache-Control", "public, max-age=86400");
  response.headers.set(
    "Vercel-Cache-Tag",
    linkCache._createNotFoundCacheKey({ domain, key }),
  );
  return response;
};
