import { getDomainViaEdge } from "@/lib/planetscale/get-domain-via-edge";
import { DUB_HEADERS } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "./parse";

export const handleNotFoundLink = async (req: NextRequest) => {
  const { domain } = parse(req);

  // check if domain has notFoundUrl configured
  const domainData = await getDomainViaEdge(domain);
  if (domainData?.notFoundUrl) {
    return NextResponse.redirect(domainData.notFoundUrl, {
      headers: {
        ...DUB_HEADERS,
        "X-Robots-Tag": "googlebot: noindex",
        // pass the Referer value to the not found URL
        Referer: req.url,
      },
      status: 302,
    });
  } else {
    return NextResponse.rewrite(new URL(`/${domain}/not-found`, req.url), {
      headers: DUB_HEADERS,
    });
  }
};
