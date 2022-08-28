import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: "/([^/.]*)",
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;
  const key = url.split("/")[1];
  if (key.length === 0) {
    // for root (/), just return as is
    return NextResponse.next();
  }
  return NextResponse.rewrite(new URL(`/api/links/${key}`, req.url));
}
