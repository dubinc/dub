import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { hubSpotOAuthProvider } from "@/lib/integrations/hubspot/oauth";
import {
  hubSpotSettingsSchema,
  hubSpotWebhookSchema,
} from "@/lib/integrations/hubspot/schema";
import { trackHubSpotLeadEvent } from "@/lib/integrations/hubspot/track-lead";
import { trackHubSpotSaleEvent } from "@/lib/integrations/hubspot/track-sale";
import { prisma } from "@dub/prisma";
import crypto from "crypto";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";

const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || "";

// POST /api/hubspot/webhook – listen to webhook events from Hubspot
export const POST = withAxiom(async (req: AxiomRequest) => {
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
    await Promise.allSettled(payload.map(processWebhookEvent));

    return NextResponse.json({ message: "Webhook received." });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});

// Process individual event
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
}
