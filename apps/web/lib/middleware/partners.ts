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
];

export default async function PartnersMiddleware(req: NextRequest) {
  const { path, fullPath } = parse(req);

  const user = await getUserViaToken(req);

  const isUnauthenticatedPath = UNAUTHENTICATED_PATHS.some((p) =>
    path.startsWith(p),
  );

  if (!user) {
    if (isUnauthenticatedPath) {
      return NextResponse.rewrite(
        new URL(`/partners.dub.co${fullPath === "/" ? "" : fullPath}`, req.url),
      );
    }
    return NextResponse.redirect(new URL("/login", req.url)); // Redirect unauthenticated users to login
  }

  if (["/login", "/register"].some((p) => path.startsWith(p))) {
    return NextResponse.redirect(new URL("/", req.url)); // Redirect authenticated users to dashboard
  }

  const partnersEnabled = await userIsInBeta(user.email, "partnersPortal");

  if (!partnersEnabled && path !== "/")
    return NextResponse.redirect(new URL("/", req.url));

  const defaultPartner = await getDefaultPartner(user);

  if (!defaultPartner && !path.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  } else if (path === "/") {
    return NextResponse.redirect(new URL("/programs", req.url));
  }

  return NextResponse.rewrite(
    new URL(`/partners.dub.co${fullPath === "/" ? "" : fullPath}`, req.url),
  );
}
