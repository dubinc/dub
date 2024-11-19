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
];

export default async function PartnersMiddleware(req: NextRequest) {
  const { path, searchParamsString } = parse(req);

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
    !["/account", "/pn_", "/onboarding"].some((p) => path.startsWith(p))
  ) {
    const defaultPartner = await getDefaultPartner(user);

    if (!defaultPartner) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    return NextResponse.redirect(
      new URL(`/${defaultPartner}${path}${searchParamsString}`, req.url),
    );
  }

  // Redirect to home if partner flag is off
  if (user && !partnersEnabled && !isUnauthenticatedPath && path !== "/")
    return NextResponse.redirect(new URL("/", req.url));

  return NextResponse.rewrite(
    new URL(`/partners.dub.co${path === "/" ? "" : path}`, req.url),
  );
}
