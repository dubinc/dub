import { ratelimit } from "@/lib/upstash";
import { isValidUrl } from "@dub/utils";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { getMetaTags } from "./utils";
import { getIdentityHash } from "@/lib/edge";

export const runtime = "edge";

export async function GET(req: NextRequest) {
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
    const identity_hash = await getIdentityHash(req);
    const { success } = await ratelimit().limit(`metatags:${identity_hash}`);
    if (!success) {
      return new Response("Don't DDoS me pls 🥺", { status: 429 });
    }
  }

  const metatags = await getMetaTags(url);
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
