import { parse } from "@/lib/middleware/utils";
import { APP_DOMAIN, getUrlFromString } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export default async function CreateLinkMiddleware(req: NextRequest) {
  const { domain, fullKey } = parse(req);

  const url = getUrlFromString(fullKey);

  const redirectURL = new URL(`${APP_DOMAIN}/new`);
  redirectURL.searchParams.append("link", url);
  redirectURL.searchParams.append("domain", domain);

  return NextResponse.redirect(redirectURL.toString());
}
