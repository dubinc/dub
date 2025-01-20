import { parse } from "@/lib/middleware/utils";
import { NextRequest, NextResponse } from "next/server";
import { userIsInBeta } from "../edge-config";
import { getDefaultPartner } from "./utils/get-default-partner";
import { getUserViaToken } from "./utils/get-user-via-token";

const AUTHENTICATED_PATHS = [
  "/programs",
  "/marketplace",
  "/onboarding",
  "/waitlist",
  "/settings",
  "/account",
];

export default async function PartnersMiddleware(req: NextRequest) {
  const { path, fullPath } = parse(req);

  const user = await getUserViaToken(req);

  const isAuthenticatedPath = AUTHENTICATED_PATHS.some(
    (p) => path === "/" || path.startsWith(p),
  );

  if (!user && isAuthenticatedPath) {
    return NextResponse.redirect(
      new URL(
        `/login${path === "/" ? "" : `?next=${encodeURIComponent(fullPath)}`}`,
        req.url,
      ),
    );
  } else if (user) {
    const partnersEnabled = await userIsInBeta(user.email, "partnersPortal");

    if (!partnersEnabled) {
      if (path !== "/waitlist") {
        return NextResponse.redirect(new URL("/waitlist", req.url));
      }
    } else {
      const defaultPartner = await getDefaultPartner(user);

      if (!defaultPartner && !path.startsWith("/onboarding")) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      } else if (path === "/" || path.startsWith("/pn_")) {
        return NextResponse.redirect(new URL("/programs", req.url));
      } else if (
        ["/login", "/register"].some(
          (p) => path.startsWith(p) || path.endsWith(p),
        )
      ) {
        return NextResponse.redirect(new URL("/", req.url)); // Redirect authenticated users to dashboard
      }
    }
  }

  return NextResponse.rewrite(new URL(`/partners.dub.co${fullPath}`, req.url));
}
