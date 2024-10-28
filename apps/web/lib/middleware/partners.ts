import { parse } from "@/lib/middleware/utils";
import { NextRequest, NextResponse } from "next/server";

export default function PartnersMiddleware(req: NextRequest) {
  const { path } = parse(req);

  return NextResponse.rewrite(
    new URL(`/partners.dub.co${path === "/" ? "" : path}`, req.url),
  );
}
