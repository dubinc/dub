import { parse } from "@/lib/middleware/utils";
import { NextRequest, NextResponse } from "next/server";
import { getUserViaToken } from "./utils/get-user-via-token";

export default async function PartnersMiddleware(req: NextRequest) {
  const { path } = parse(req);

  const user = await getUserViaToken(req);

  if (!user && path !== "/login")
    return NextResponse.redirect(new URL("/login", req.url)); // Redirect unauthenticated users to login
  else if (user && path === "/login")
    return NextResponse.redirect(new URL("/", req.url)); // Redirect authenticated users to dashboard

  return NextResponse.rewrite(
    new URL(`/partners.dub.co${path === "/" ? "" : path}`, req.url),
  );
}
