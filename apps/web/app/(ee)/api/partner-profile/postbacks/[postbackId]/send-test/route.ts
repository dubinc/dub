import { DubApiError } from "@/lib/api/errors";
import { getPostbackOrThrow } from "@/lib/api/postbacks/get-postback-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import { sendPartnerPostback } from "@/lib/postback/api/send-partner-postback";
import commissionCreated from "@/lib/postback/sample-events/commission-created.json";
import leadCreated from "@/lib/postback/sample-events/lead-created.json";
import saleCreated from "@/lib/postback/sample-events/sale-created.json";
import { sendTestPostbackInputSchema } from "@/lib/postback/schemas";
import { PostbackTrigger } from "@/lib/types";
import { NextResponse } from "next/server";

const samplePayloads: Record<PostbackTrigger, Record<string, unknown>> = {
  "lead.created": leadCreated,
  "sale.created": saleCreated,
  "commission.created": commissionCreated,
};

// POST /api/partner-profile/postbacks/[postbackId]/send-test
export const POST = withPartnerProfile(
  async ({ partner, params, req }) => {
    const { postbackId } = params;

    const { event } = sendTestPostbackInputSchema.parse(
      await parseRequestBody(req),
    );

    const postback = await getPostbackOrThrow({
      postbackId,
      partnerId: partner.id,
    });

    const triggers = postback.triggers as string[];

    if (!triggers.includes(event)) {
      throw new DubApiError({
        code: "bad_request",
        message: "The selected event is not configured for this postback.",
      });
    }

    await sendPartnerPostback({
      partnerId: partner.id,
      event,
      data: samplePayloads[event],
      skipEnrichment: true,
    });

    return NextResponse.json({});
  },
  {
    requiredPermission: "postbacks.write",
    featureFlag: "postbacks",
  },
);
