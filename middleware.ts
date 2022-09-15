import { NextRequest, NextFetchEvent, NextResponse } from "next/server";
import {
  AppMiddleware,
  LinkMiddleware,
  RootMiddleware,
} from "@/lib/middleware";
import { parse } from "@/lib/middleware/utils";
import { RESERVED_KEYS } from "@/lib/constants";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api|_next|static|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { hostname, key } = parse(req);
  const home = hostname === "dub.sh" || hostname === "localhost:3000";
  const app = hostname === "app.dub.sh" || hostname === "app.localhost:3000";

  if (app) {
    return AppMiddleware(req);
  }

  if (key.length === 0) {
    return RootMiddleware(req, ev);
  }

  if (home && RESERVED_KEYS.includes(key)) {
    return NextResponse.next();
  }

  return LinkMiddleware(req, ev);
}
