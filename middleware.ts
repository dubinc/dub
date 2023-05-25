import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { APP_HOSTNAMES, DEFAULT_REDIRECTS } from "@/lib/constants";
import {
  AppMiddleware,
  ApiMiddleware,
  LinkMiddleware,
  RootMiddleware,
} from "@/lib/middleware";
import { parse } from "@/lib/middleware/utils";
import { isReservedKey } from "./lib/utils";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api/ routes
     * 2. /_next/ (Next.js internals)
     * 3. /_proxy/, /_auth/ (special pages for OG tags proxying and password protection)
     * 4. /_static (inside /public)
     * 5. /_vercel (Vercel internals)
     * 6. /favicon.ico, /sitemap.xml (static files)
     */
    "/((?!api/|_next/|_proxy/|_auth/|_static|_vercel|favicon.ico|sitemap.xml).*)",
  ],
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { domain, path, key } = parse(req);

  // for App (e.g. app.dub.sh)
  if (APP_HOSTNAMES.has(domain)) {
    return AppMiddleware(req);
  }

  // for API (api.dub.sh and api.localhost:3000)
  if (domain === "api.dub.sh" || domain === "api.localhost:3000") {
    return ApiMiddleware(req);
  }

  // for public stats pages (e.g. dub.sh/stats/github)
  if (path.startsWith("/stats/")) {
    return NextResponse.rewrite(new URL(`/${domain}${path}`, req.url));
  }

  // for root pages (e.g. dub.sh, vercel.fyi, etc.)
  if (key.length === 0) {
    return RootMiddleware(req, ev);
  }

  if (domain === "dub.sh") {
    if (DEFAULT_REDIRECTS[key]) {
      return NextResponse.redirect(DEFAULT_REDIRECTS[key]);
    }
    if (await isReservedKey(key)) {
      return NextResponse.rewrite(new URL(`/dub.sh${path}`, req.url));
    }
  }

  return LinkMiddleware(req, ev);
}
