import { trackLead } from "@/lib/api/conversions/track-lead";
import { trackSale } from "@/lib/api/conversions/track-sale";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import { trackLeadRequestSchema } from "@/lib/zod/schemas/leads";
import { trackSaleRequestSchema } from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = z.object({
  publishableKey: z
    .string()
    .min(1, "publishableKey is required")
    .startsWith("dub_pk_", "Invalid publishable key format.")
    .describe("The workspace's publishable key on Dub."),
  eventName: z.string().min(1, "eventName is required"),
});

// GET /api/appsflyer/webhook – listen to Postback events from AppsFlyer
export const GET = withAxiom(async (req) => {
  try {
    const queryParams = getSearchParams(req.url);

    const { publishableKey, eventName } = querySchema.parse(queryParams);

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

    // Track lead event
    if (eventName === "lead") {
      const {
        clickId,
        eventName,
        customerExternalId,
        customerName,
        customerEmail,
        customerAvatar,
      } = trackLeadRequestSchema.parse(queryParams);

      await trackLead({
        clickId,
        eventName,
        customerExternalId,
        customerName,
        customerEmail,
        customerAvatar,
        eventQuantity: undefined,
        mode: undefined,
        metadata: null,
        workspace,
        rawBody: queryParams,
      });

      return NextResponse.json("Lead event tracked successfully.");
    }

    // Track sale event
    if (eventName === "sale") {
      const { eventName, customerExternalId, amount, currency, invoiceId } =
        trackSaleRequestSchema.parse(queryParams);

      await trackSale({
        customerExternalId,
        amount,
        currency,
        eventName,
        paymentProcessor: undefined,
        invoiceId,
        leadEventName: undefined,
        metadata: null,
        workspace,
        rawBody: queryParams,
      });

      return NextResponse.json("Sale event tracked successfully.");
    }

    return NextResponse.json(`Unknow ${eventName} event.`);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});

export const HEAD = () => {
  return new Response("OK");
};
