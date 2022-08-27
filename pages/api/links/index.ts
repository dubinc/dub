import type { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { customAlphabet } from "nanoid";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "POST") {
    const url = req.nextUrl.searchParams.get("url");
    const nanoid = customAlphabet(
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      7
    ); // 7-character random string (similar to bit.ly)
    const key = nanoid(); //
    const response = await redis.hset("links", {
      [key]: url,
    });
    if (response === 1) {
      return new Response(
        JSON.stringify({
          key,
          url,
        }),
        { status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({
          error: "failed to save link",
        }),
        { status: 500 }
      );
    }
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
