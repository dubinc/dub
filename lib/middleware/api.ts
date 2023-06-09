import { NextRequest, NextResponse } from "next/server";
import { parse } from "@/lib/middleware/utils";

export default async function ApiMiddleware(req: NextRequest) {
  const { path } = parse(req);
  if (path.startsWith("/metatags")) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.rewrite(new URL("/metatags", req.url));
    }
    return NextResponse.rewrite(
      new URL(`/api/edge/metatags?url=${url}`, req.url),
    );
  }
  return NextResponse.rewrite(new URL(`/api${path}`, req.url));
}
