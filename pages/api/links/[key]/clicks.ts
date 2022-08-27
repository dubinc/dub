import type { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { customAlphabet } from "nanoid";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const url = req.nextUrl.pathname;
    const key = url.split("/")[3];
    const response = (await redis.hget("stats", key)) || "0";
    return new Response(JSON.stringify(response), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
