import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { parse } from "@/lib/middleware/utils";

export default async function AppMiddleware(req: NextRequest) {
  const { path } = parse(req);
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session?.email && path !== "/login" && path !== "/register") {
    return NextResponse.redirect(new URL("/login", req.url));
  } else if (session?.email && (path === "/login" || path === "/register")) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.rewrite(new URL(`/app${path}`, req.url));
}
