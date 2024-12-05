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

  const isUnauthenticatedPath = UNAUTHENTICATED_PATHS.some((p) =>
    path.startsWith(p),
  );

  const user = await getUserViaToken(req);

  if (!user && !isUnauthenticatedPath)
    return NextResponse.redirect(new URL("/login", req.url)); // Redirect unauthenticated users to login
  else if (user && path === "/login")
    return NextResponse.redirect(new URL("/", req.url)); // Redirect authenticated users to dashboard

  const partnersEnabled = user
    ? await userIsInBeta(user.email, "partnersPortal")
    : false;

  if (
    user &&
    partnersEnabled &&
    !["/account", "/apply", "/pn_", "/onboarding"].some((p) =>
      path.startsWith(p),
    )
  ) {
    const defaultPartner = await getDefaultPartner(user);

    if (!defaultPartner) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    if (!isUnauthenticatedPath)
      return NextResponse.redirect(
        new URL(`/${defaultPartner}${fullPath}`, req.url),
      );
  }

  // Redirect to home if partner flag is off
  if (user && !partnersEnabled && !isUnauthenticatedPath && path !== "/")
    return NextResponse.redirect(new URL("/", req.url));

  return NextResponse.rewrite(
    new URL(`/partners.dub.co${fullPath === "/" ? "" : fullPath}`, req.url),
  );
}
