import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(
  req: NextRequest,
  ev: NextFetchEvent,
  res: NextResponse
) {
  if (req.method === "GET") {
    const url = req.nextUrl.pathname;
    const key = url.split("/")[1]; // pathname is `/[key]` because we rewrote with middleware
    const target = await redis.hget<string>("links", key); // get the target url from redis
    if (target) {
      ev.waitUntil(redis.hincrby("stats", key, 1)); // increment click count
      return NextResponse.redirect(target, {
        headers: {
          "cache-control":
            "public, s-maxage=31536000, stale-while-revalidate=31536000",
        }, // cache for 1 year only if there is a valid target for key
      });
    } else {
      return NextResponse.redirect("/");
    }
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
