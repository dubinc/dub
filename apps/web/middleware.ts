import {
  AdminMiddleware,
  ApiMiddleware,
  AppMiddleware,
  AxiomMiddleware,
  CreateLinkMiddleware,
  LinkMiddleware,
} from "@/lib/middleware";
import { PublicRoutesMiddleware } from "@/lib/middleware/public-routes.ts";
import { parse } from "@/lib/middleware/utils";
import { getUserCountry } from "@/lib/middleware/utils/get-user-country.ts";
import { getUserViaToken } from "@/lib/middleware/utils/get-user-via-token.ts";
import { initSessionCookie } from "@/lib/middleware/utils/init-session.ts";
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
     * 4. /images/ (static images)
     * 5. Metadata files: favicon.ico, sitemap.xml, robots.txt, manifest.webmanifest, .well-known
     */
    "/((?!api/|_next/|_proxy/|images/|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|.well-known).*)",
  ],
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { domain, key, fullKey } = parse(req);
  const country = await getUserCountry(req);
  const user = await getUserViaToken(req);

  req.cookies.set("test", "test");

  // Инициализируем session cookie для всех пользователей
  const sessionCookie = initSessionCookie(req, user);

  AxiomMiddleware(req, ev);

  PublicRoutesMiddleware(req, country, user, sessionCookie);

  // for App
  if (APP_HOSTNAMES.has(domain)) {
    console.log("middleware here1");
    return AppMiddleware(req, country, user, sessionCookie);
  }

  // for API
  if (API_HOSTNAMES.has(domain)) {
    console.log("middleware here2");
    return ApiMiddleware(req);
  }

  // default redirects for dub.sh
  if (domain === "dub.sh" && DEFAULT_REDIRECTS[key]) {
    const response = NextResponse.redirect(DEFAULT_REDIRECTS[key]);
    if (sessionCookie) {
      response.headers.set("Set-Cookie", sessionCookie);
    }
    return response;
  }

  // for Admin
  if (ADMIN_HOSTNAMES.has(domain)) {
    console.log("middleware here3");
    const response = await AdminMiddleware(req);
    if (sessionCookie) {
      response.headers.set("Set-Cookie", sessionCookie);
    }
    return response;
  }

  if (PARTNERS_HOSTNAMES.has(domain)) {
    console.log("middleware here4");
    const response = await PartnersMiddleware(req);
    if (sessionCookie) {
      response.headers.set("Set-Cookie", sessionCookie);
    }
    return response;
  }

  console.log("middleware here5");

  if (isValidUrl(fullKey)) {
    return CreateLinkMiddleware(req);
  }

  return LinkMiddleware(req, ev);
}
