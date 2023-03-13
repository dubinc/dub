import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { DEFAULT_REDIRECTS } from "@/lib/constants";
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
     * 3. /_proxy/, /_auth/, /_root/ (special pages for OG tags proxying, password protection, and placeholder _root pages)
     * 4. /_static (inside /public)
     * 5. /_vercel (Vercel internals)
     * 6. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_proxy/|_auth/|_root/|_static|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { domain, path, key } = parse(req);
  const home = domain === "dub.sh";

  // for App (app.dub.sh and app.localhost:3000)
  if (domain === "app.dub.sh" || domain === "app.localhost:3000") {
    return AppMiddleware(req);
  }

  // for API (api.dub.sh and api.localhost:3000)
  if (domain === "api.dub.sh" || domain === "api.localhost:3000") {
    return ApiMiddleware(req);
  }

  // for public stats pages (e.g. dub.sh/stats/github)
  if (path.startsWith("/stats/")) {
    return NextResponse.next();
  }

  // for root pages (e.g. dub.sh, vercel.fyi, etc.)
  if (key.length === 0) {
    return RootMiddleware(req, ev);
  }

  if (home) {
    if (path.startsWith("/static")) {
      return NextResponse.rewrite(
        new URL("/_static" + path.split("/static")[1], req.url),
      );
    }
    if (DEFAULT_REDIRECTS[key]) {
      return NextResponse.redirect(DEFAULT_REDIRECTS[key]);
    }
    if (await isReservedKey(key)) {
      return NextResponse.next();
    }
  }

  return LinkMiddleware(req, ev);
}
