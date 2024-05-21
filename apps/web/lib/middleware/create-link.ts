import { parse } from "@/lib/middleware/utils";
import { APP_DOMAIN, getUrlFromString } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export default function CreateLinkMiddleware(req: NextRequest) {
  const { domain, fullPath } = parse(req);

  const url = getUrlFromString(fullPath.slice(1));

  const redirectURL = new URL(`${APP_DOMAIN}/new`);
  redirectURL.searchParams.append("link", url);
  redirectURL.searchParams.append("domain", domain);

  return NextResponse.redirect(redirectURL.toString());
}
