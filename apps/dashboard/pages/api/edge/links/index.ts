import { NextResponse, type NextRequest } from "next/server";
import { ipAddress } from "@vercel/edge";
import { LOCALHOST_IP } from "#/lib/constants";
import { ratelimit, setRandomKey } from "#/lib/upstash";
import { isValidUrl } from "#/lib/utils";
import { isBlacklistedDomain } from "#/lib/edge-config";

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "POST") {
    const { url } = (await req.json()) as { url?: string };
    if (!url || !isValidUrl(url)) {
      return new Response("Invalid URL", { status: 400 });
    }

    const ip = ipAddress(req) || LOCALHOST_IP;
    const { success } = await ratelimit(5, "1 m").limit(ip);
    if (!success) {
      return new Response("Don't DDoS me pls 🥺", { status: 429 });
    }

    const domainBlacklisted = await isBlacklistedDomain(url);
    if (domainBlacklisted) {
      return new Response("Invalid URL", { status: 400 });
    }

    const { response, key } = await setRandomKey(url);
    if (response === "OK") {
      // if key was successfully added
      return NextResponse.json(
        {
          key,
          url,
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          error: "Failed to create link",
        },
        { status: 500 },
      );
    }
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
