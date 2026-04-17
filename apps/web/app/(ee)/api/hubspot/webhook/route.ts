import { captureWebhookLog } from "@/lib/api-logs/capture-webhook-log";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import { hubSpotOAuthProvider } from "@/lib/integrations/hubspot/oauth";
import {
  hubSpotSettingsSchema,
  hubSpotWebhookSchema,
} from "@/lib/integrations/hubspot/schema";
import { trackHubSpotLeadEvent } from "@/lib/integrations/hubspot/track-lead";
import { trackHubSpotSaleEvent } from "@/lib/integrations/hubspot/track-sale";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import crypto from "crypto";
import { NextResponse } from "next/server";

const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || "";

// POST /api/hubspot/webhook – listen to webhook events from Hubspot
export const POST = withAxiom(async (req) => {
  const startTime = Date.now();

  try {
    const rawPayload = await req.text();
    const signature = req.headers.get("X-HubSpot-Signature");

    // Verify webhook signature
    if (!signature) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing X-HubSpot-Signature header.",
      });
    }

    if (!HUBSPOT_CLIENT_SECRET) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Missing HUBSPOT_CLIENT_SECRET environment variable.",
      });
    }

    // Create expected hash: client_secret + request_body
    const sourceString = HUBSPOT_CLIENT_SECRET + rawPayload;
    const expectedHash = crypto
      .createHash("sha256")
      .update(sourceString)
      .digest("hex");

    // Compare with provided signature
    if (signature !== expectedHash) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Invalid webhook signature.",
      });
    }

    const payload = JSON.parse(rawPayload) as any[];

    // HS send multiple events in the same request
    // so we need to process each event individually
    const results = await Promise.allSettled(payload.map(processWebhookEvent));

    const responseBody = { message: "Webhook received." };
    const duration = Date.now() - startTime;

    // Collect log entries from fulfilled results, including failures
    const logEntries: Array<{
      workspaceId: string;
      statusCode: number;
      responseBody: unknown;
      requestBody: unknown;
    }> = [];

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "fulfilled" || !r.value) {
        continue;
      }

      const { workspaceId, errorResponse } = r.value;

      logEntries.push({
        workspaceId,
        statusCode: errorResponse ? errorResponse.status : 200,
        responseBody: errorResponse ?? responseBody,
        requestBody: payload[i],
      });
    }

    waitUntil(
      Promise.allSettled(
        logEntries.map((entry) =>
          captureWebhookLog({
            workspaceId: entry.workspaceId,
            method: req.method,
            path: "/hubspot/webhook",
            statusCode: entry.statusCode,
            duration,
            requestBody: entry.requestBody,
            responseBody: entry.responseBody,
            userAgent: req.headers.get("user-agent"),
          }),
        ),
      ),
    );

    return NextResponse.json(responseBody);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});

// Process individual event, returns workspaceId and error response if failed
async function processWebhookEvent(event: any) {
  const { objectTypeId, portalId, subscriptionType } =
    hubSpotWebhookSchema.parse(event);

  // Find the installation
  const installation = await prisma.installedIntegration.findFirst({
    where: {
      integration: {
        slug: "hubspot",
      },
      credentials: {
        path: "$.hub_id",
        equals: portalId,
      },
    },
    include: {
      project: true,
    },
  });

  if (!installation) {
    console.error(
      `[HubSpot] Installation is not found for portalId ${portalId}.`,
    );
    return;
  }

  const { project: workspace } = installation;

  // Refresh the access token if needed
  const authToken =
    await hubSpotOAuthProvider.refreshTokenForInstallation(installation);

  if (!authToken) {
    console.error(
      `[HubSpot] Authentication token is not found or valid for portalId ${portalId}.`,
    );
    return;
  }

  const settings = hubSpotSettingsSchema.parse(installation.settings ?? {});

  console.log("[HubSpot] Event", event);
  console.log("[HubSpot] Integration settings", settings);

  try {
    // Contact events
    if (objectTypeId === "0-1") {
      const isContactCreated = subscriptionType === "object.creation";

      const isLifecycleStageChanged =
        subscriptionType === "object.propertyChange" &&
        settings.leadTriggerEvent === "lifecycleStageReached";

      if (isContactCreated || isLifecycleStageChanged) {
        await trackHubSpotLeadEvent({
          payload: event,
          workspace,
          authToken,
          settings,
        });
      }
    }

    // Deal event
    if (objectTypeId === "0-3") {
      const isDealCreated =
        subscriptionType === "object.creation" &&
        settings.leadTriggerEvent === "dealCreated";

      const isDealUpdated = subscriptionType === "object.propertyChange";

      // Track the final lead event
      if (isDealCreated) {
        await trackHubSpotLeadEvent({
          payload: event,
          workspace,
          authToken,
          settings,
        });
      }

      // Track the sale event when deal is closed won
      else if (isDealUpdated) {
        await trackHubSpotSaleEvent({
          payload: event,
          workspace,
          authToken,
          settings,
        });
      }
    }
  } catch (error) {
    return {
      workspaceId: workspace.id,
      errorResponse: handleAndReturnErrorResponse(error),
    };
  }

  return {
    workspaceId: workspace.id,
  };
}
