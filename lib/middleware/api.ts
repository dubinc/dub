import { NextRequest, NextResponse } from "next/server";
import { parse } from "#/lib/middleware/utils";
import { HOME_DOMAIN } from "../constants";

export default async function ApiMiddleware(req: NextRequest) {
  const { fullPath } = parse(req);
  if (fullPath === "/") {
    return NextResponse.redirect(`${HOME_DOMAIN}/help/article/dub-api`, {
      status: 301,
    });

    // special case for metatags
  } else if (fullPath.startsWith("/metatags")) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.redirect(`${HOME_DOMAIN}/metatags`, {
        status: 301,
      });
    }
    return NextResponse.rewrite(
      new URL(`/api/edge/metatags?url=${url}`, req.url),
    );
  }
  return NextResponse.rewrite(new URL(`/api${fullPath}`, req.url));
}
