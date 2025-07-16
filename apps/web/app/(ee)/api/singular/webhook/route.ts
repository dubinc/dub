import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { trackSingularLeadEvent } from "@/lib/integrations/singular/track-lead";
import { trackSingularSaleEvent } from "@/lib/integrations/singular/track-sale";
import { getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";

const singularToDubEvent = {
  sng_complete_registration: "lead",
  sng_subscribe: "sale",
  sng_ecommerce_purchase: "sale",
  "Copy GAID": "lead", // Singular Device Assist
  "copy IDFA": "lead", // Singular Device Assist
};

const supportedEvents = Object.keys(singularToDubEvent);

// GET /api/singular/webhook – listen to Postback events from Singular
export const GET = async (req: Request) => {
  try {
    const searchParams = getSearchParams(req.url);

    console.log("[Singular] Postback received", searchParams);

    const { event_name: eventName } = searchParams;

    if (!supportedEvents.includes(eventName)) {
      throw new DubApiError({
        code: "bad_request",
        message: `Event ${eventName} is not supported by Singular <> Dub integration.`,
      });
    }

    const dubEvent = singularToDubEvent[eventName];

    if (dubEvent === "lead") {
      await trackSingularLeadEvent(searchParams);
    } else if (dubEvent === "sale") {
      await trackSingularSaleEvent(searchParams);
    } else {
      throw new DubApiError({
        code: "bad_request",
        message: `Event ${eventName} is not supported by Singular <> Dub integration.`,
      });
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
};

export const HEAD = async (req: Request) => {
  return new Response("OK");
};
