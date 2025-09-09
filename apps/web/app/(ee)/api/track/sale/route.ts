import { trackSale } from "@/lib/api/conversions/track-sale";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { trackSaleRequestSchema } from "@/lib/zod/schemas/sales";
import { NextResponse } from "next/server";
import { z } from "zod";

// POST /api/track/sale – Track a sale conversion event
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const body = await parseRequestBody(req);

    let {
      customerExternalId: newExternalId,
      externalId: oldExternalId, // deprecated
      customerId: oldCustomerId, // deprecated
      customerName,
      customerEmail,
      customerAvatar,
      clickId,
      paymentProcessor,
      invoiceId,
      amount,
      currency,
      metadata,
      eventName,
      leadEventName,
    } = trackSaleRequestSchema
      .extend({
        // add backwards compatibility
        customerExternalId: z.string().nullish(),
        externalId: z.string().nullish(),
        customerId: z.string().nullish(),
      })
      .parse(body);

    const customerExternalId = newExternalId || oldExternalId || oldCustomerId;

    if (!customerExternalId) {
      throw new DubApiError({
        code: "bad_request",
        message: "customerExternalId is required",
      });
    }

    const response = await trackSale({
      customerExternalId,
      customerName,
      customerEmail,
      customerAvatar,
      clickId,
      amount,
      currency,
      eventName,
      paymentProcessor,
      invoiceId,
      leadEventName,
      metadata,
      workspace,
      rawBody: body,
    });

    return NextResponse.json(response);
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
