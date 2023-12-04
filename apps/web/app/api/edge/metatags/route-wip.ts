import { ratelimit } from "@/lib/upstash";
import { LOCALHOST_IP, isValidUrl } from "@dub/utils";
import { ipAddress } from "@vercel/edge";
import { getToken } from "next-auth/jwt";
import { NextFetchEvent, NextRequest } from "next/server";
import { getMetaTags } from "./utils";

export const runtime = "edge";

// TODO: waitUntil() is not supported in App Router yet: https://vercel.com/docs/functions/edge-functions/edge-functions-api#waituntil
export async function GET(req: NextRequest, ev: NextFetchEvent) {
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
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
