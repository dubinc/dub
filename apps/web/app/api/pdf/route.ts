import { NextRequest, NextResponse } from "next/server";

import { generatePDF } from "@dub/pdf";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const response = await generatePDF();

  return NextResponse.json({
    response,
  });
}
