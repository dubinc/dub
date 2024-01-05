import { parse } from "@/lib/middleware/utils";
import { HOME_DOMAIN } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export default function ApiMiddleware(req: NextRequest) {
  const { path, fullPath, domain } = parse(req);
  if (fullPath === "/" && domain === "api.dub.co") {
    return NextResponse.redirect(`${HOME_DOMAIN}/help/article/dub-api`, {
      status: 307,
    });

    // special case for metatags
  } else if (path === "/metatags") {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.redirect(`${HOME_DOMAIN}/tools/metatags`, {
        status: 301,
      });
    }
    return NextResponse.rewrite(
      new URL(`/api/edge/metatags?url=${url}`, req.url),
    );
  }
  // Note: we don't have to account for paths starting with `/api`
  // since they're automatically excluded via our middleware matcher
  return NextResponse.rewrite(new URL(`/api${fullPath}`, req.url));
}
