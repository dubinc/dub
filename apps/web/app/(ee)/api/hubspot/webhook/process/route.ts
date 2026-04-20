import { captureWebhookLog } from "@/lib/api-logs/capture-webhook-log";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { hubSpotOAuthProvider } from "@/lib/integrations/hubspot/oauth";
import {
  hubSpotSettingsSchema,
  hubSpotWebhookSchema,
} from "@/lib/integrations/hubspot/schema";
import { trackHubSpotLeadEvent } from "@/lib/integrations/hubspot/track-lead";
import { trackHubSpotSaleEvent } from "@/lib/integrations/hubspot/track-sale";
import { WorkspaceProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { logAndRespond } from "../../../cron/utils";

// POST /api/hubspot/webhook/process – process individual webhook event
export const POST = withAxiom(async (req) => {
  const startTime = Date.now();

  let body: any;
  let workspace:
    | Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">
    | undefined;

  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    body = JSON.parse(rawBody);

    const { objectTypeId, portalId, subscriptionType } =
      hubSpotWebhookSchema.parse(body);

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
      return logAndRespond(
        `[HubSpot] Installation is not found for portalId ${portalId}.`,
      );
    }

    workspace = installation.project;

    // Refresh the access token if needed
    const authToken =
      await hubSpotOAuthProvider.refreshTokenForInstallation(installation);

    if (!authToken) {
      return logAndRespond(
        `[HubSpot] Authentication token is not found or valid for portalId ${portalId}.`,
      );
    }

    const settings = hubSpotSettingsSchema.parse(installation.settings ?? {});

    console.log("[HubSpot] Integration settings", settings);

    let response = "";

    // Contact events
    if (objectTypeId === "0-1") {
      const isContactCreated = subscriptionType === "object.creation";

      const isLifecycleStageChanged =
        subscriptionType === "object.propertyChange" &&
        settings.leadTriggerEvent === "lifecycleStageReached";

      if (isContactCreated || isLifecycleStageChanged) {
        response = await trackHubSpotLeadEvent({
          payload: body,
          workspace,
          authToken,
          settings,
        });
      } else {
        response = `Skipping contact event: subscriptionType "${subscriptionType}" does not match the configured leadTriggerEvent "${settings.leadTriggerEvent}".`;
      }
    }

    // Deal event
    else if (objectTypeId === "0-3") {
      const isDealCreated =
        subscriptionType === "object.creation" &&
        settings.leadTriggerEvent === "dealCreated";

      const isDealUpdated = subscriptionType === "object.propertyChange";

      // Track the final lead event
      if (isDealCreated) {
        response = await trackHubSpotLeadEvent({
          payload: body,
          workspace,
          authToken,
          settings,
        });
      }

      // Track the sale event when deal is closed won
      else if (isDealUpdated) {
        response = await trackHubSpotSaleEvent({
          payload: body,
          workspace,
          authToken,
          settings,
        });
      }
    }

    // Unknown object type
    else {
      response = `Unknown objectTypeId ${objectTypeId}.`;
    }

    await captureWebhookLog({
      workspaceId: workspace.id,
      method: "POST",
      path: "/hubspot/webhook",
      statusCode: 200,
      duration: Date.now() - startTime,
      requestBody: body,
      responseBody: response,
      userAgent: req.headers.get("user-agent"),
    });

    return logAndRespond(response);
  } catch (error) {
    const response = handleAndReturnErrorResponse(error);

    if (workspace) {
      await captureWebhookLog({
        workspaceId: workspace.id,
        method: "POST",
        path: "/hubspot/webhook",
        statusCode: response.status,
        duration: Date.now() - startTime,
        requestBody: body,
        responseBody: response,
        userAgent: req.headers.get("user-agent"),
      });
    }

    return response;
  }
});
