import {
  getHostnameFromRequest,
  verifyAnalyticsAllowedHostnames,
} from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { trackLead } from "@/lib/api/conversions/track-lead";
import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withPublishableKey } from "@/lib/auth/publishable-key";
import { trackLeadRequestSchema } from "@/lib/zod/schemas/leads";
import { NextResponse } from "next/server";

// POST /api/track/lead/client – Track a lead conversion event on the client side
export const POST = withPublishableKey(
  async ({ req, workspace }) => {
    const body = await parseRequestBody(req);

    const allowRequest = verifyAnalyticsAllowedHostnames({
      allowedHostnames: (workspace?.allowedHostnames ?? []) as string[],
      req,
    });

    if (!allowRequest) {
      throw new DubApiError({
        code: "forbidden",
        message: `Request origin '${getHostnameFromRequest(req)}' is not included in the allowed hostnames for this workspace. Update your allowed hostnames here: https://app.dub.co/settings/analytics`,
      });
    }

    const {
      clickId,
      eventName,
      eventQuantity,
      customerExternalId,
      customerName,
      customerEmail,
      customerAvatar,
      mode,
      metadata,
    } = trackLeadRequestSchema.parse(body);

    const response = await trackLead({
      clickId,
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

    return NextResponse.json(response, { headers: COMMON_CORS_HEADERS });
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

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: COMMON_CORS_HEADERS,
  });
};
