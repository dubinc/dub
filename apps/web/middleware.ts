import {
  AdminMiddleware,
  ApiMiddleware,
  AppMiddleware,
  AxiomMiddleware,
  CreateLinkMiddleware,
  LinkMiddleware,
} from "@/lib/middleware";
import { parse } from "@/lib/middleware/utils";
import {
  ADMIN_HOSTNAMES,
  API_HOSTNAMES,
  APP_HOSTNAMES,
  DEFAULT_REDIRECTS,
  isValidUrl,
} from "@dub/utils";
import { PARTNERS_HOSTNAMES } from "@dub/utils/src/constants";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import PartnersMiddleware from "./lib/middleware/partners";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api/ routes
     * 2. /_next/ (Next.js internals)
     * 3. /_proxy/ (proxies for third-party services)
     * 4. Metadata files: favicon.ico, sitemap.xml, robots.txt, manifest.webmanifest, .well-known
     */
    "/((?!api/|_next/|_proxy/|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|.well-known|embed.js).*)",
  ],
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { domain, path, key, fullKey } = parse(req);

  AxiomMiddleware(req, ev);

  // for App
  if (APP_HOSTNAMES.has(domain)) {
    return AppMiddleware(req);
  }

  // for API
  if (API_HOSTNAMES.has(domain)) {
    return ApiMiddleware(req);
  }

  // for public stats pages (e.g. d.to/stats/try)
  if (path.startsWith("/stats/")) {
    return NextResponse.rewrite(new URL(`/${domain}${path}`, req.url));
  }

  // default redirects for dub.sh
  if (domain === "dub.sh" && DEFAULT_REDIRECTS[key]) {
    return NextResponse.redirect(DEFAULT_REDIRECTS[key]);
  }

  // for Admin
  if (ADMIN_HOSTNAMES.has(domain)) {
    return AdminMiddleware(req);
  }

  if (PARTNERS_HOSTNAMES.has(domain)) {
    return PartnersMiddleware(req);
  }

  if (isValidUrl(fullKey)) {
    return CreateLinkMiddleware(req);
  }

  return LinkMiddleware(req, ev);
}
