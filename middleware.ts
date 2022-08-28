import { NextRequest, NextResponse, NextFetchEvent } from "next/server";
import { redis } from "@/lib/redis";

export const config = {
  matcher: "/([^/.]*)",
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const url = req.nextUrl.pathname;
  const key = url.split("/")[1];
  if (key.length === 0) {
    // for root (/), just return as is
    return NextResponse.next();
  }
  ev.waitUntil(redis.hincrby("stats", key, 1)); // increment click count
  return NextResponse.rewrite(new URL(`/api/links/${key}`, req.url));
}
