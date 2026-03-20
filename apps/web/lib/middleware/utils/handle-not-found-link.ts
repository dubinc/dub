import { getDomainViaEdge } from "@/lib/planetscale/get-domain-via-edge";
import { DUB_HEADERS } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "./parse";

export const handleNotFoundLink = async (req: NextRequest) => {
  const { domain } = parse(req);

  // check if domain has notFoundUrl configured
  const domainData = await getDomainViaEdge(domain);
  if (domainData?.notFoundUrl) {
    const response = NextResponse.redirect(domainData.notFoundUrl, {
      headers: {
        ...DUB_HEADERS,
        "X-Robots-Tag": "googlebot: noindex",
        // pass the Referer [sic] value to the not found URL
        Referer: req.url,
      },
      status: 302,
    });
    response.headers.set(
      "Vercel-CDN-Cache-Control",
      "s-maxage=3600, stale-while-revalidate=86400",
    );
    return response;
  } else {
    const response = NextResponse.rewrite(
      new URL(`/${domain}/not-found`, req.url),
      {
        headers: DUB_HEADERS,
      },
    );
    response.headers.set(
      "Vercel-CDN-Cache-Control",
      "s-maxage=3600, stale-while-revalidate=86400",
    );
    response.headers.set("Cache-Control", "public, max-age=300");
    return response;
  }
};
