import { ratelimit } from "@/lib/upstash";
import { LOCALHOST_IP, isValidUrl } from "@dub/utils";
import { ipAddress } from "@vercel/edge";
import { getMetaTags } from "app/api/edge/metatags/utils";
import { getToken } from "next-auth/jwt";
import { NextFetchEvent, NextRequest } from "next/server";

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest, ev: NextFetchEvent) {
  if (req.method === "GET") {
    const url = req.nextUrl.searchParams.get("url");
    if (!url || !isValidUrl(url)) {
      return new Response("Invalid URL", { status: 400 });
    }

    // Rate limit if user is not logged in
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session?.email) {
      const ip = ipAddress(req) || LOCALHOST_IP;
      const { success } = await ratelimit().limit(ip);
      if (!success) {
        return new Response("Don't DDoS me pls 🥺", { status: 429 });
      }
    }

    const metatags = await getMetaTags(url, ev);
    return new Response(JSON.stringify(metatags), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } else if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
