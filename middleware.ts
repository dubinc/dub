import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_REDIRECTS,
  HOME_HOSTNAMES,
  RESERVED_KEYS,
} from "@/lib/constants";
import {
  AppMiddleware,
  LinkMiddleware,
  RootMiddleware,
} from "@/lib/middleware";
import { parse } from "@/lib/middleware/utils";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_proxy & /_auth (special pages for OG tag proxying and password protection)
     * 4. /static (inside /public)
     * 5. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api|_next|_proxy|_auth|static|va|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { domain, key } = parse(req);
  const home = HOME_HOSTNAMES.has(domain);
  const app = domain === "app.dub.sh" || domain === "app.localhost:3000";

  if (app) {
    return AppMiddleware(req);
  }

  if (key.length === 0) {
    return RootMiddleware(req, ev);
  }

  if (home) {
    if (DEFAULT_REDIRECTS[key]) {
      return NextResponse.redirect(DEFAULT_REDIRECTS[key]);
    }
    if (RESERVED_KEYS.has(key)) {
      return NextResponse.next();
    }
  }

  return LinkMiddleware(req, ev);
}
