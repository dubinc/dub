import { NextRequest, NextResponse } from "next/server";
import { parse } from "@/lib/middleware/utils";

export default async function ApiMiddleware(req: NextRequest) {
  const { path } = parse(req);
  if (path.startsWith("/metatags")) {
    return NextResponse.rewrite(new URL("/api/edge/metatags", req.url));
  }
  return NextResponse.rewrite(new URL(`/api${path}`, req.url));
}
