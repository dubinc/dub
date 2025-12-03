import { NextRequest, NextResponse } from "next/server";
import { parse } from "./utils/parse";

export function EmbedMiddleware(req: NextRequest) {
  const { searchParamsObj, fullPath } = parse(req);

  if (searchParamsObj.token) {
    return NextResponse.rewrite(new URL(`/app.dub.co${fullPath}`, req.url));
  }

  // TODO: Show token expiry page
  return NextResponse.redirect(new URL("/", req.url));
}
