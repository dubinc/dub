import { parse } from "@/lib/middleware/utils";
import { NextRequest, NextResponse } from "next/server";
import { getDefaultPartner } from "./utils/get-default-partner";
import { getUserViaToken } from "./utils/get-user-via-token";

export default async function PartnersMiddleware(req: NextRequest) {
  const { path } = parse(req);

  const user = await getUserViaToken(req);

  if (!user && path !== "/login")
    return NextResponse.redirect(new URL("/login", req.url)); // Redirect unauthenticated users to login
  else if (user && path === "/login")
    return NextResponse.redirect(new URL("/", req.url)); // Redirect authenticated users to dashboard

  if (user && path === "/") {
    const defaultPartner = await getDefaultPartner(user);
    if (!defaultPartner)
      return NextResponse.redirect(new URL("/onboarding", req.url));
    return NextResponse.redirect(new URL(`/${defaultPartner}`, req.url));
  }

  return NextResponse.rewrite(
    new URL(`/partners.dub.co${path === "/" ? "" : path}`, req.url),
  );
}
