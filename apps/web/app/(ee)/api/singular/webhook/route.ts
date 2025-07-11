import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getClickEvent } from "@/lib/tinybird";
import { ClickEventTB } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";
import { trackSingularLeadEvent } from "./track-lead-event";
import { trackSingularSaleEvent } from "./track-sale-event";

const supportedEvents = [
  "sng_complete_registration",
  "sng_subscribe",
  "sng_ecommerce_purchase",
];

const singularToDubEvent = {
  sng_complete_registration: "lead",
  sng_subscribe: "sale",
  sng_ecommerce_purchase: "sale",
};

const customEventSchema = z.object({
  dub_id: z.string().min(1),
  event_name: z.string(),
  event_date: z.string().nullable(),
  event_time: z.string().nullable(),
  install_date: z.string().nullable(),
  install_time: z.string().nullable(),
});

const saleEventSchema = customEventSchema.merge(
  z.object({
    revenue: z.number().nullable(),
  }),
);

const schema = z.discriminatedUnion("event_name", [
  customEventSchema,
  saleEventSchema,
]);

// GET /api/singular/webhook – listen to Postback events from Singular
export const GET = async (req: Request) => {
  try {
    const searchParams = getSearchParams(req.url);

    console.debug("Parameters", searchParams);

    const {
      dub_id: clickId,
      event_name: eventName,
      event_date: eventDate,
      event_time: eventTime,
      install_date: installDate,
      install_time: installTime,
    } = schema.parse(searchParams);

    if (!supportedEvents.includes(eventName)) {
      throw new DubApiError({
        code: "bad_request",
        message: `Event ${eventName} is not supported by Singular <> Dub integration.`,
      });
    }

    // Find the click event
    let clickData: ClickEventTB | null = null;
    const clickEvent = await getClickEvent({
      clickId,
    });

    if (clickEvent && clickEvent.data && clickEvent.data.length > 0) {
      clickData = clickEvent.data[0];
    }

    if (!clickData) {
      const cachedClickData = await redis.get<ClickEventTB>(
        `clickIdCache:${clickId}`,
      );

      if (cachedClickData) {
        clickData = {
          ...cachedClickData,
          timestamp: cachedClickData.timestamp
            .replace("T", " ")
            .replace("Z", ""),
          qr: cachedClickData.qr ? 1 : 0,
          bot: cachedClickData.bot ? 1 : 0,
        };
      }
    }

    if (!clickData) {
      throw new DubApiError({
        code: "not_found",
        message: `Click event not found for clickId: ${clickId}`,
      });
    }

    // TODO:
    // How to skip already tracked events
    // How to identify the customer (do they pass the these info via)

    // Find the link associated with the click event
    const { link_id: linkId } = clickData;

    const link = await prisma.link.findUniqueOrThrow({
      where: {
        id: linkId,
      },
    });

    if (!link.projectId) {
      throw new DubApiError({
        code: "not_found",
        message: "Link does not belong to a workspace.",
      });
    }

    const dubEvent = singularToDubEvent[eventName];

    if (dubEvent === "lead") {
      await trackSingularLeadEvent({
        clickData,
        link,
      });
    } else if (dubEvent === "sale") {
      await trackSingularSaleEvent({
        clickData,
        link,
      });
    }

    return NextResponse.json({
      clickId,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
};

export const HEAD = async (req: Request) => {
  return new Response("OK");
};
