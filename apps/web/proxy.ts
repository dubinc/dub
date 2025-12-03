import { logger } from "@/lib/axiom/server";
import { parse } from "@/lib/proxy/utils/parse";
import { transformMiddlewareRequest } from "@axiomhq/nextjs";
import {
  ADMIN_HOSTNAMES,
  API_HOSTNAMES,
  APP_HOSTNAMES,
  DEFAULT_REDIRECTS,
  isValidUrl,
} from "@dub/utils";
import { PARTNERS_HOSTNAMES } from "@dub/utils/src/constants";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { AdminProxy } from "./lib/proxy/admin";
import { ApiProxy } from "./lib/proxy/api";
import { AppProxy } from "./lib/proxy/app";
import { CreateLinkProxy } from "./lib/proxy/create-link";
import { LinkProxy } from "./lib/proxy/link";
import { PartnersProxy } from "./lib/proxy/partners";
import { supportedWellKnownFiles } from "./lib/well-known";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api/ routes
     * 2. /_next/ (Next.js internals)
     * 3. /_proxy/ (proxies for third-party services)
     * 4. Metadata files: favicon.ico, sitemap.xml, robots.txt, manifest.webmanifest
     */
    "/((?!api/|_next/|_proxy/|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest).*)",
  ],
};

export async function proxy(req: NextRequest, ev: NextFetchEvent) {
  const { domain, path, key, fullKey } = parse(req);

  // Axiom logging
  logger.info(...transformMiddlewareRequest(req));
  ev.waitUntil(logger.flush());

  // for App
  if (APP_HOSTNAMES.has(domain)) {
    return AppProxy(req);
  }

  // for API
  if (API_HOSTNAMES.has(domain)) {
    return ApiProxy(req);
  }

  // for public stats pages (e.g. d.to/stats/try)
  if (path.startsWith("/stats/")) {
    return NextResponse.rewrite(new URL(`/${domain}${path}`, req.url));
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

  // default redirects for dub.sh
  if (domain === "dub.sh" && DEFAULT_REDIRECTS[key]) {
    return NextResponse.redirect(DEFAULT_REDIRECTS[key]);
  }

  // for Admin
  if (ADMIN_HOSTNAMES.has(domain)) {
    return AdminProxy(req);
  }

  if (PARTNERS_HOSTNAMES.has(domain)) {
    return PartnersProxy(req);
  }

  if (isValidUrl(fullKey)) {
    return CreateLinkProxy(req);
  }

  return LinkProxy(req, ev);
}
