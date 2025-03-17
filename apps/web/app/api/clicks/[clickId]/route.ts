import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { getClickEvent } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import {
  clickEventSchemaTB,
  clickPartnerDiscountSchema,
} from "@/lib/zod/schemas/clicks";
import { prismaEdge } from "@dub/prisma/edge";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

type ClickData = z.infer<typeof clickEventSchemaTB>;

const schema = z.object({
  clickId: z.string(),
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// GET /api/clicks/:clickId – Get a click event by clickId
export async function GET(
  req: NextRequest,
  { params }: { params: { clickId: string } },
) {
  try {
    const { clickId } = schema.parse(params);

    await ratelimitOrThrow(req, clickId);

    // Find linkId for the click event
    let linkId: string | null = null;

    // Fetch click data from Redis
    const clickData = await redis.get<ClickData>(`click:${clickId}`);

    if (clickData) {
      linkId = clickData.link_id;
    }

    // Fallback to Tinybird if click data is not found in Redis
    if (!clickData) {
      const clickEvent = await getClickEvent({
        clickId,
      });

      if (clickEvent && clickEvent.data && clickEvent.data.length > 0) {
        linkId = clickEvent.data[0].link_id;
      }
    }

    if (!linkId) {
      throw new DubApiError({
        code: "not_found",
        message: `Click event not found for clickId: ${clickId}`,
      });
    }

    const link = await prismaEdge.link.findUnique({
      where: {
        id: linkId,
      },
      select: {
        domain: true,
        key: true,
      },
    });

    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: `Link not found for the click event ${clickId}.`,
      });
    }

    const cachedLink = await linkCache.get({
      domain: link.domain,
      key: link.key,
    });

    return NextResponse.json(
      clickPartnerDiscountSchema.parse({
        clickId,
        partner: cachedLink?.partner,
        discount: cachedLink?.discount,
      }),
      {
        headers: CORS_HEADERS,
      },
    );
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
