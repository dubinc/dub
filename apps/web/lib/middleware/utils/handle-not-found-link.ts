import { linkCache } from "@/lib/api/links/cache";
import { getDomainViaEdge } from "@/lib/planetscale/get-domain-via-edge";
import { DUB_HEADERS } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "./parse";

export const handleNotFoundLink = async (req: NextRequest) => {
  const { domain, fullKey } = parse(req);

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
  // TODO: remove this after debugging
  response.headers.forEach((value, key) => {
    console.log(`[before] ${key}: ${value}`);
  });

  response.headers.set("Vercel-CDN-Cache-Control", "public, s-maxage=86400");
  response.headers.set(
    "Vercel-Cache-Tag",
    linkCache._createNotFoundCacheKeys({ domain, key: fullKey }),
  );

  // TODO: remove this after debugging
  response.headers.forEach((value, key) => {
    console.log(`[after] ${key}: ${value}`);
  });

  return response;
};
