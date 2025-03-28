import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { clickCache } from "@/lib/api/links/click-cache";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { linkPartnerDiscountSchema } from "@/lib/zod/schemas/clicks";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const schema = z.object({
  clickId: z.string({ required_error: "clickId is required." }),
});

// GET /api/clicks/:clickId – Get a click event by clickId
export async function GET(
  req: NextRequest,
  { params }: { params: { clickId: string } },
) {
  try {
    const { clickId } = schema.parse(params);
    await ratelimitOrThrow(req, clickId);

    const clickData = await clickCache.getPartner(clickId);

    if (!clickData) {
      return NextResponse.json(
        { error: `Click with clickId ${clickId} not found.` },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(linkPartnerDiscountSchema.parse(clickData), {
      headers: CORS_HEADERS,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error, CORS_HEADERS);
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
