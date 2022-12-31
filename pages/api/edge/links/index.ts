import type { NextRequest } from "next/server";
import { setRandomKey } from "@/lib/upstash";
import { isBlacklistedDomain } from "@/lib/utils";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "POST") {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return new Response(`Missing url`, { status: 400 });
    }
    const domainBlacklisted = await isBlacklistedDomain(url);
    if (domainBlacklisted) {
      return new Response(`Invalid url`, { status: 400 });
    }
    const { response, key } = await setRandomKey(url);
    if (response === "OK") {
      // if key was successfully added
      return new Response(
        JSON.stringify({
          key,
          url,
        }),
        { status: 200 },
      );
    } else {
      return new Response(
        JSON.stringify({
          error: "failed to save link",
        }),
        { status: 500 },
      );
    }
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
