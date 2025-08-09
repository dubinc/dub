import { trackLead } from "@/lib/api/conversions/track-lead";
import { parseRequestBody } from "@/lib/api/utils";
import { withPublishableKey } from "@/lib/auth/publishable-key";
import { trackLeadRequestSchema } from "@/lib/zod/schemas/leads";
import { NextResponse } from "next/server";

// POST /api/track/lead/client – Track a lead conversion event on the client side
export const POST = withPublishableKey(
  async ({ req, workspace }) => {
    const body = await parseRequestBody(req);

    const {
      clickId,
      eventName,
      customerExternalId,
      customerName,
      customerEmail,
      customerAvatar,
    } = trackLeadRequestSchema.parse(body);

    const response = await trackLead({
      clickId,
      eventName,
      customerExternalId,
      customerName,
      customerEmail,
      customerAvatar,
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
