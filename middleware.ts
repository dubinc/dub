import { NextRequest, NextFetchEvent, NextResponse } from "next/server";
import {
  AppMiddleware,
  LinkMiddleware,
  RootMiddleware,
} from "@/lib/middleware";
import { parse } from "@/lib/middleware/utils";
import { RESERVED_KEYS } from "@/lib/constants";

export const config = {
  matcher: "/([^/.]*)",
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { hostname, key } = parse(req);

  if (hostname === "app.dub.sh" || hostname === "app.localhost:3000") {
    return AppMiddleware(req);
  }

  if (key.length === 0) {
    return RootMiddleware(req);
  }

  if (RESERVED_KEYS.includes(key)) {
    return NextResponse.next();
  }

  return LinkMiddleware(req, ev);
}
