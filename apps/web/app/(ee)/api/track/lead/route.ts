import { trackLead } from "@/lib/api/conversions/track-lead";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { trackLeadRequestSchema } from "@/lib/zod/schemas/leads";
import { NextResponse } from "next/server";
import { z } from "zod";

// POST /api/track/lead – Track a lead conversion event
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const body = await parseRequestBody(req);

    const {
      clickId,
      eventName,
      eventQuantity,
      customerExternalId: newExternalId,
      externalId: oldExternalId, // deprecated (but we'll support it for backwards compatibility)
      customerId: oldCustomerId, // deprecated (but we'll support it for backwards compatibility)
      customerName,
      customerEmail,
      customerAvatar,
      mode,
      metadata,
    } = trackLeadRequestSchema
      .extend({
        // we if clickId is undefined/nullish, we'll coerce into an empty string
        clickId: z.string().nullish(),
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

    const response = await trackLead({
      clickId: clickId ?? "",
      eventName,
      eventQuantity,
      customerExternalId,
      customerName,
      customerEmail,
      customerAvatar,
      mode,
      metadata,
      rawBody: body,
      workspace,
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
