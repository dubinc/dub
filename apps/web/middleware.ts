import {
  AdminMiddleware,
  ApiMiddleware,
  AppMiddleware,
  AxiomMiddleware,
  CreateLinkMiddleware,
  LinkMiddleware,
} from "@/lib/middleware";
import { parse } from "@/lib/middleware/utils";
import { getUserCountry } from "@/lib/middleware/utils/get-user-country.ts";
import {
  ADMIN_HOSTNAMES,
  API_HOSTNAMES,
  APP_HOSTNAMES,
  DEFAULT_REDIRECTS,
  isValidUrl,
} from "@dub/utils";
import { PARTNERS_HOSTNAMES } from "@dub/utils/src/constants";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_REGIONS,
  PUBLIC_ROUTES,
} from "./app/[domain]/(public)/constants/types.ts";
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
  const { domain, path, key, fullKey } = parse(req);
  const country = await getUserCountry(req);

  console.log("here");
  console.log(domain, path, key, fullKey);
  console.log(APP_HOSTNAMES.has(domain));
  console.log(process.env.NEXT_PUBLIC_VERCEL_ENV);
  console.log(process.env.NEXT_PUBLIC_APP_DOMAIN);

  AxiomMiddleware(req, ev);

  // Try to fix public routes locally
  if (
    PUBLIC_ROUTES.includes(path) ||
    path.startsWith("/help") ||
    ALLOWED_REGIONS.includes(path.slice(1))
  ) {
    return NextResponse.rewrite(new URL(`/${domain}${path}`, req.url), {
      headers: {
        "Set-Cookie": `country=${country}; Path=/; Secure; SameSite=Strict;`,
      },
    });
  }

  // for App
  if (APP_HOSTNAMES.has(domain)) {
    console.log("middleware here1");
    return AppMiddleware(req, country);
  }

  // for API
  if (API_HOSTNAMES.has(domain)) {
    console.log("middleware here2");
    return ApiMiddleware(req);
  }

  // for public stats pages (e.g. d.to/stats/try)
  // if (path.startsWith("/stats/")) {
  //   return NextResponse.rewrite(new URL(`/${domain}${path}`, req.url));
  // }

  // default redirects for dub.sh
  if (domain === "dub.sh" && DEFAULT_REDIRECTS[key]) {
    return NextResponse.redirect(DEFAULT_REDIRECTS[key]);
  }

  // for Admin
  if (ADMIN_HOSTNAMES.has(domain)) {
    console.log("middleware here3");
    return AdminMiddleware(req);
  }

  if (PARTNERS_HOSTNAMES.has(domain)) {
    console.log("middleware here4");
    return PartnersMiddleware(req);
  }

  console.log("middleware here5");

  if (isValidUrl(fullKey)) {
    return CreateLinkMiddleware(req);
  }

  return LinkMiddleware(req, ev);
}
