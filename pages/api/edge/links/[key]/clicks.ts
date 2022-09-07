import type { NextRequest } from "next/server";
import { redis } from "@/lib/redis";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const url = req.nextUrl.pathname;
    const key = url.split("/")[4];
    const response = (await redis.zcard(`dub.sh:${key}:clicks`)) || "0";
    return new Response(JSON.stringify(response), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
