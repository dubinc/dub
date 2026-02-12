import { getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const postbackId = getSearchParams(req.url).postbackId;
  return NextResponse.json(
    { received: true, postbackId: postbackId ?? undefined },
    { status: 200 },
  );
}
