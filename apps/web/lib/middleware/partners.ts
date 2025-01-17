import { parse } from "@/lib/middleware/utils";
import { NextRequest, NextResponse } from "next/server";
import { userIsInBeta } from "../edge-config";
import { getDefaultPartner } from "./utils/get-default-partner";
import { getUserViaToken } from "./utils/get-user-via-token";

const UNAUTHENTICATED_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth/reset-password",
  "/apply",
  "/apply/framer",
  "/framer",
  "/framer/apply",
  "/framer/login",
];

export default async function PartnersMiddleware(req: NextRequest) {
  const { path, fullPath } = parse(req);

  const user = await getUserViaToken(req);

  const isUnauthenticatedPath = UNAUTHENTICATED_PATHS.some((p) => path === p);

  if (!user && !isUnauthenticatedPath) {
    return NextResponse.redirect(
      new URL(
        `/login${path === "/" ? "" : `?next=${encodeURIComponent(fullPath)}`}`,
        req.url,
      ),
    );
  } else if (user) {
    const partnersEnabled = await userIsInBeta(user.email, "partnersPortal");

    if (!partnersEnabled) {
      return NextResponse.rewrite(new URL("/partners.dub.co", req.url));
    }

    const defaultPartner = await getDefaultPartner(user);

    if (!defaultPartner && !path.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    } else if (path === "/" || path.startsWith("/pn_")) {
      return NextResponse.redirect(new URL("/programs", req.url));
    } else if (["/login", "/register"].some((p) => path.startsWith(p))) {
      return NextResponse.redirect(new URL("/", req.url)); // Redirect authenticated users to dashboard
    }
  }

  // if (path === "/framer") {
  //   return NextResponse.redirect(new URL("/apply/framer", req.url));
  // }

  // if (path === "/framer/apply") {
  //   return NextResponse.redirect(new URL("/apply/framer/application", req.url));
  // }

  return NextResponse.rewrite(new URL(`/partners.dub.co${fullPath}`, req.url));
}
