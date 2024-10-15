import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { domain: string; file: string } },
) {
  console.log({ params });

  return NextResponse.json(params);
}
