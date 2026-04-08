import { trackLead } from "@/lib/api/conversions/track-lead";
import { trackSale } from "@/lib/api/conversions/track-sale";
import { isLocalDev } from "@/lib/api/environment";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getIP } from "@/lib/api/utils/get-ip";
import { withAxiom } from "@/lib/axiom/server";
import { appsflyerAmountToDubCents } from "@/lib/integrations/appsflyer/amount-to-dub-cents";
import { APPSFLYER_IP_RANGES } from "@/lib/integrations/appsflyer/constants";
import { isIpInRange } from "@/lib/middleware/utils/is-ip-in-range";
import { trackLeadRequestSchema } from "@/lib/zod/schemas/leads";
import { trackSaleRequestSchema } from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { APPSFLYER_INTEGRATION_ID, getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = z.object({
  appId: z.string(),
  partnerEventId: z.string(),
  eventValue: z.string().nullish(),
});

// GET /api/appsflyer/webhook – listen to Postback events from AppsFlyer
export const GET = withAxiom(async (req) => {
  try {
    if (!isLocalDev) {
      const ip = await getIP();
      const isAllowed = APPSFLYER_IP_RANGES.some((range) =>
        isIpInRange(ip, range),
      );

      if (!isAllowed) {
        throw new DubApiError({
          code: "forbidden",
          message: `IP address ${ip} is not allowed.`,
        });
      }
    }

    const queryParams = getSearchParams(req.url);

    const { appId, partnerEventId } = querySchema.parse(queryParams);

    if (!["lead", "sale"].includes(partnerEventId)) {
      return NextResponse.json("partnerEventId is not supported. Skipping...");
    }

    // Find the installation
    const installation = await prisma.installedIntegration.findFirst({
      where: {
        integrationId: APPSFLYER_INTEGRATION_ID,
        settings: {
          path: "$.appIds",
          array_contains: appId,
        },
      },
      select: {
        project: {
          select: {
            id: true,
            stripeConnectId: true,
            webhookEnabled: true,
          },
        },
      },
    });

    if (!installation) {
      throw new DubApiError({
        code: "bad_request",
        message: "AppsFlyer integration is not configured for this app.",
      });
    }

    // Track lead event
    if (partnerEventId === "lead") {
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
        workspace: installation.project,
        rawBody: queryParams,
      });

      return NextResponse.json("Lead event tracked successfully.");
    }

    // Track sale event
    if (partnerEventId === "sale") {
      const amountInCents = appsflyerAmountToDubCents(queryParams.amount);
      const { eventName, customerExternalId, amount, currency, invoiceId } =
        trackSaleRequestSchema.parse({
          ...queryParams,
          ...(amountInCents !== undefined && { amount: amountInCents }),
        });

      await trackSale({
        customerExternalId,
        amount,
        currency,
        eventName,
        paymentProcessor: "custom",
        invoiceId,
        leadEventName: undefined,
        metadata: null,
        workspace: installation.project,
        rawBody: queryParams,
      });

      return NextResponse.json("Sale event tracked successfully.");
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});

export const HEAD = () => {
  return new Response("OK");
};
