import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import { trackAppsFlyerLeadEvent } from "@/lib/integrations/appsflyer/track-lead";
import { trackAppsFlyerSaleEvent } from "@/lib/integrations/appsflyer/track-sale";
import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = z.object({
  publishable_key: z
    .string()
    .min(1, "publishable_key is required")
    .startsWith("dub_pk_", "Invalid publishable key format.")
    .describe("The workspace's publishable key on Dub."),
  event_type: z.enum(["lead", "sale"]),
});

// GET /api/appsflyer/webhook – listen to Postback events from AppsFlyer
export const GET = withAxiom(async (req) => {
  try {
    const queryParams = getSearchParams(req.url);

    const { publishable_key: publishableKey, event_type: eventType } =
      querySchema.parse(queryParams);

    const workspace = await prisma.project.findUnique({
      where: {
        publishableKey,
      },
      select: {
        id: true,
        stripeConnectId: true,
        webhookEnabled: true,
      },
    });

    if (!workspace) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Invalid publishable key.",
        docUrl:
          "https://dub.co/docs/api-reference/authentication#create-a-publishable-key",
      });
    }

    delete queryParams.publishable_key;
    delete queryParams.event_type;

    if (eventType === "lead") {
      await trackAppsFlyerLeadEvent({
        queryParams,
        workspace,
      });
    } else if (eventType === "sale") {
      await trackAppsFlyerSaleEvent({
        queryParams,
        workspace,
      });
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});

export const HEAD = () => {
  return new Response("OK");
};
