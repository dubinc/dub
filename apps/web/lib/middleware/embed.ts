import { NextRequest, NextResponse } from "next/server";
import { parse } from "./utils/parse";

export function EmbedMiddleware(req: NextRequest) {
  const { path, searchParamsObj, fullPath } = parse(req);

  if (path.startsWith("/embed/support-chat")) {
    return NextResponse.rewrite(new URL(`/app.dub.co${fullPath}`, req.url));
  }

  if (searchParamsObj.token) {
    return NextResponse.rewrite(new URL(`/app.dub.co${fullPath}`, req.url));
  }

  // TODO: Show token expiry page
  return NextResponse.redirect(new URL("/", req.url));
}
