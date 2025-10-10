import {
  ApiMiddleware,
  AppMiddleware,
  // AxiomMiddleware,
  CreateLinkMiddleware,
  LinkMiddleware,
} from "@/lib/middleware";
import { parse } from "@/lib/middleware/utils";
import { getUserViaToken } from "@/lib/middleware/utils/get-user-via-token.ts";
import { supportedWellKnownFiles } from "@/lib/well-known.ts";
import { API_HOSTNAMES, APP_HOSTNAMES, isValidUrl } from "@dub/utils";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { ALLOWED_REGIONS, PUBLIC_ROUTES } from "./constants/links.ts";
import { userSessionIdInit } from "./core/services/cookie/user-session-id-init.service.ts";
import { getUserCountry } from "./lib/middleware/utils/get-user-country.ts";

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
  const { domain, key, fullKey, path } = parse(req);

  const country = await getUserCountry(req);
  const user = await getUserViaToken(req);

  // Initialize session ID for all users (both new and existing)
  const sessionInit = userSessionIdInit(req);

  // Apply Axiom middleware
  // AxiomMiddleware(req, ev);

  const isPublicRoute =
    PUBLIC_ROUTES.includes(path) ||
    path.startsWith("/help") ||
    ALLOWED_REGIONS.includes(path.slice(1).toLowerCase());

  // Handle public routes for App
  if (isPublicRoute) {
    if (APP_HOSTNAMES.has(domain) && user) {
      return AppMiddleware(req, user, isPublicRoute, country);
    }

    const response = NextResponse.rewrite(
      new URL(`/${domain}${path}`, req.url),
    );

    // Set country cookie
    if (country) {
      response.cookies.set("country", country, {
        secure: true,
        sameSite: "lax",
      });
    }

    // Set session cookie if needed
    if (sessionInit.needsUpdate) {
      response.cookies.set(sessionInit.cookieName, sessionInit.sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
    }

    // Set source cookie if needed
    if (sessionInit.needsSourceCookie) {
      response.cookies.set(
        sessionInit.sourceCookieName,
        sessionInit.sourceCookieValue,
        {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
        },
      );
    }

    return response;
  }

  // for App
  if (APP_HOSTNAMES.has(domain)) {
    return AppMiddleware(req, user, false, country);
  }

  // for API
  if (API_HOSTNAMES.has(domain)) {
    return ApiMiddleware(req);
  }

  // for .well-known routes
  if (path.startsWith("/.well-known/")) {
    const file = path.split("/.well-known/").pop();
    if (file && supportedWellKnownFiles.includes(file)) {
      return NextResponse.rewrite(
        new URL(`/wellknown/${domain}/${file}`, req.url),
      );
    }
  }

  // // default redirects for dub.sh
  // if (domain === "dub.sh" && DEFAULT_REDIRECTS[key]) {
  //   return NextResponse.redirect(DEFAULT_REDIRECTS[key]);
  // }

  // // for Admin
  // if (ADMIN_HOSTNAMES.has(domain)) {
  //   return AdminMiddleware(req);
  // }
  //
  // if (PARTNERS_HOSTNAMES.has(domain)) {
  //   return PartnersMiddleware(req);
  // }

  if (isValidUrl(fullKey)) {
    return CreateLinkMiddleware(req);
  }

  return LinkMiddleware(req, ev);
}
