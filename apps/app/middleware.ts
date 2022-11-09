import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import {
  AppMiddleware,
  LinkMiddleware,
  RootMiddleware,
} from "@dub/lib/middleware";
import { parse } from "@dub/lib/middleware/utils";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_proxy & /_auth (special pages for OG tag proxying and password protection)
     * 4. /_static (inside /public)
     * 5. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api|_next|_proxy|_auth|_static|va|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { domain, key } = parse(req);

  if (
    domain === `app.${process.env.CUSTOM_DOMAIN}` ||
    domain === "app.localhost:3000"
  ) {
    return AppMiddleware(req);
  }

  if (key.length === 0) {
    return RootMiddleware(req, ev);
  }

  return LinkMiddleware(req, ev);
}
