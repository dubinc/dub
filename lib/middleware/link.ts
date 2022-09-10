import { NextRequest, NextFetchEvent, NextResponse } from "next/server";
import { redis, recordClick } from "@/lib/upstash";
import { parse } from "@/lib/middleware/utils";
import { LinkProps } from "../api/types";

export default async function LinkMiddleware(
  req: NextRequest,
  ev: NextFetchEvent
) {
  const { hostname, key } = parse(req);

  if (!hostname || !key) {
    return NextResponse.next();
  }

  const response = await redis.hget<Omit<LinkProps, "key">>(
    `${hostname}:links`,
    key
  );
  const target = response?.url;

  if (target) {
    ev.waitUntil(recordClick(hostname, key, req)); // increment click count
    return NextResponse.redirect(target);
  } else {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
}
