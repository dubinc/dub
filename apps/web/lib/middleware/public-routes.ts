import { AppMiddleware } from "@/lib/middleware/index.ts";
import { parse } from "@/lib/middleware/utils";
import { UserProps } from "@/lib/types.ts";
import { APP_HOSTNAMES } from "@dub/utils/src";
import { NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_REGIONS,
  PUBLIC_ROUTES,
} from "../../app/[domain]/(public)/constants/types.ts";

export const PublicRoutesMiddleware = (
  req: NextRequest,
  country?: string,
  user?: UserProps,
  sessionCookie?: string,
) => {
  const { domain, path } = parse(req);

  const isPublicRoute =
    PUBLIC_ROUTES.includes(path) ||
    path.startsWith("/help") ||
    ALLOWED_REGIONS.includes(path.slice(1));

  // Try to fix public routes locally
  if (isPublicRoute) {
    if (APP_HOSTNAMES.has(domain)) {
      if (user) {
        return AppMiddleware(req, country, user, sessionCookie, isPublicRoute);
      }
    }

    const cookies = [`country=${country}; Path=/; Secure; SameSite=Strict;`];
    if (sessionCookie) {
      cookies.push(sessionCookie);
    }

    return NextResponse.rewrite(new URL(`/${domain}${path}`, req.url), {
      headers: {
        "Set-Cookie": cookies.join(", "),
      },
    });
  }
};
