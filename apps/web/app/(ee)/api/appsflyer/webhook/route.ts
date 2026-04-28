import { captureWebhookLog } from "@/lib/api-logs/capture-webhook-log";
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
import { Project } from "@dub/prisma/client";
import { APPSFLYER_INTEGRATION_ID, getSearchParams } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = z.object({
  appId: z.string(),
  partnerEventId: z.string(),
  eventValue: z.string().nullish(),
});

// GET /api/appsflyer/webhook – listen to Postback events from AppsFlyer
export const GET = withAxiom(async (req) => {
  const startTime = Date.now();
  let response = "OK";
  let queryParams: Record<string, string> | null = null;
  let workspace: Pick<
    Project,
    "id" | "stripeConnectId" | "webhookEnabled"
  > | null = null;

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

    queryParams = getSearchParams(req.url);

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

    workspace = installation.project;

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
        workspace,
      });

      response = "Lead event tracked successfully.";
    }

    // Track sale event
    else if (partnerEventId === "sale") {
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
        workspace,
      });

      response = "Sale event tracked successfully.";
    }

    waitUntil(
      captureWebhookLog({
        workspaceId: workspace.id,
        method: req.method,
        path: "/appsflyer/webhook",
        statusCode: 200,
        duration: Date.now() - startTime,
        requestBody: queryParams,
        responseBody: response,
        userAgent: req.headers.get("user-agent"),
      }),
    );

    return NextResponse.json(response);
  } catch (error) {
    const errorResponse = handleAndReturnErrorResponse(error);

    if (workspace) {
      waitUntil(
        captureWebhookLog({
          workspaceId: workspace.id,
          method: req.method,
          path: "/appsflyer/webhook",
          statusCode: errorResponse.status,
          duration: Date.now() - startTime,
          requestBody: queryParams,
          responseBody: errorResponse,
          userAgent: req.headers.get("user-agent"),
        }),
      );
    }

    return errorResponse;
  }
});

export const HEAD = () => {
  return new Response("OK");
};
