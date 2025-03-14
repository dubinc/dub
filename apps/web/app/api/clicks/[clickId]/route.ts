import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { getClickEvent } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
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

    // Find click event
    let clickData: ClickData | null = null;
    const clickEvent = await getClickEvent({ clickId });

    if (clickEvent && clickEvent.data && clickEvent.data.length > 0) {
      clickData = clickEvent.data[0];
    }

    // TODO:
    // We may not have to fetch from TB; because this always happens just after a click event is recorded.

    if (!clickData) {
      clickData = await redis.get<ClickData>(`click:${clickId}`);

      if (clickData) {
        clickData = {
          ...clickData,
          timestamp: clickData.timestamp.replace("T", " ").replace("Z", ""),
          qr: clickData.qr ? 1 : 0,
          bot: clickData.bot ? 1 : 0,
        };
      }
    }

    if (!clickData) {
      throw new DubApiError({
        code: "not_found",
        message: `Click event not found for clickId: ${clickId}`,
      });
    }

    const { link_id: linkId } = clickData;

    const selectDiscount = {
      amount: true,
      maxDuration: true,
      type: true,
      couponId: true,
      couponTestId: true,
    };

    const link = await prismaEdge.link.findUnique({
      where: {
        id: linkId,
      },
      select: {
        programEnrollment: {
          select: {
            partner: {
              select: {
                name: true,
                image: true, //not sure we should return this
              },
            },
            discount: {
              select: selectDiscount,
            },
          },
        },
        program: {
          select: {
            defaultDiscount: {
              select: selectDiscount,
            },
          },
        },
      },
    });

    if (!link || !link.programEnrollment || !link.program) {
      throw new DubApiError({
        code: "not_found",
        message: `Link not found for linkId: ${linkId}`,
      });
    }

    const { programEnrollment, program } = link;
    const discount = programEnrollment.discount || program.defaultDiscount;

    return NextResponse.json(
      {
        partner: programEnrollment.partner,
        discount,
      },
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
