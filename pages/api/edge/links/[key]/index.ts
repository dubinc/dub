import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/upstash";
import { parse, detectBot } from "@/lib/middleware/utils";
import { LinkProps } from "@/lib/types";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const url = req.nextUrl.clone();
    const { hostname } = parse(req);
    const key = decodeURIComponent(url.pathname.split("/")[4]);

    const response = await redis.hget<Omit<LinkProps, "key">>(
      `${hostname}:links`,
      key
    );
    const { url: target, description, image } = response || {};
    console.log(hostname, key, target, description, image);

    if (target) {
      const isBot = detectBot(req);

      if (image && description && isBot) {
        // rewrite to proxy page (dub.sh/proxy/[domain]/[key])
        return NextResponse.rewrite(`https://dub.sh/proxy/${hostname}/${key}`);
      } else {
        return NextResponse.redirect(target, {
          status: 308,
          headers: {
            "cache-control": "public, s-maxage=60, max-age=10",
          }, // cache for 60s only if there is a valid target for key
        });
      }
    } else {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
