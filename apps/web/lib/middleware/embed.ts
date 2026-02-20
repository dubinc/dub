import { NextRequest, NextResponse } from "next/server";
import { parse } from "./utils/parse";

const PUBLIC_EMBED_PATHS = ["/embed/supported-countries"];

export function EmbedMiddleware(req: NextRequest) {
  const { path, searchParamsObj, fullPath } = parse(req);

  if (PUBLIC_EMBED_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.rewrite(new URL(`/app.dub.co${fullPath}`, req.url));
  }

  if (searchParamsObj.token) {
    return NextResponse.rewrite(new URL(`/app.dub.co${fullPath}`, req.url));
  }

  // TODO: Show token expiry page
  return NextResponse.redirect(new URL("/", req.url));
}
