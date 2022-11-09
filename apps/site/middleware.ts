import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { DEFAULT_REDIRECTS, RESERVED_KEYS } from "@dub/lib/constants";
import { LinkMiddleware } from "@dub/lib/middleware";
import RootMiddleware from "@/lib/middleware/root";
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
  const { domain, path, key } = parse(req);

  if (key.length === 0) {
    return RootMiddleware(req, ev);
  }

  if (
    domain === "dub.sh" ||
    domain === "localhost:3000" ||
    domain.includes(".vercel.app")
  ) {
    if (path.startsWith("/static")) {
      return NextResponse.rewrite(
        new URL("/_static" + path.split("/static")[1], req.url),
      );
    }
    if (DEFAULT_REDIRECTS[key]) {
      return NextResponse.redirect(DEFAULT_REDIRECTS[key]);
    }
    if (RESERVED_KEYS.has(key)) {
      return NextResponse.next();
    }
  }

  return LinkMiddleware(req, ev);
}
