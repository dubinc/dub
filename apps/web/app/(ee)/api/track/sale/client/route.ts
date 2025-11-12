import {
  getHostnameFromRequest,
  verifyAnalyticsAllowedHostnames,
} from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { trackSale } from "@/lib/api/conversions/track-sale";
import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withPublishableKey } from "@/lib/auth/publishable-key";
import { trackSaleRequestSchema } from "@/lib/zod/schemas/sales";
import { NextResponse } from "next/server";

// POST /api/track/sale/client – Track a sale conversion event on the client side
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
    } = trackSaleRequestSchema.parse(body);

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
