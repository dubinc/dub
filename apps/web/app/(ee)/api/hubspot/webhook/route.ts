import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { HUBSPOT_CLIENT_SECRET } from "@/lib/integrations/hubspot/constants";
import { refreshAccessToken } from "@/lib/integrations/hubspot/refresh-token";
import { hubSpotWebhookSchema } from "@/lib/integrations/hubspot/schema";
import { trackHubSpotLeadEvent } from "@/lib/integrations/hubspot/track-lead";
import { HubSpotAuthToken } from "@/lib/integrations/hubspot/types";
import { prisma } from "@dub/prisma";
import crypto from "crypto";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";

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
    await Promise.allSettled(payload.map(processEvent));

    return NextResponse.json({ message: "Webhook received." });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});

async function processEvent(event: any) {
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

  const workspace = installation.project;

  // Refresh the access token if needed
  const authToken = await refreshAccessToken({
    installationId: installation.id,
    authToken: installation.credentials as HubSpotAuthToken,
  });

  if (!authToken) {
    console.error(
      `[HubSpot] Authentication token is not found or valid for portalId ${portalId}.`,
    );
    return;
  }

  // Track a deferred lead event
  if (objectTypeId === "0-1") {
    await trackHubSpotLeadEvent({
      payload: event,
      workspace,
      authToken,
    });
  }

  if (objectTypeId === "0-3") {
    // Track the final lead event
    if (subscriptionType === "object.creation") {
      await trackHubSpotLeadEvent({
        payload: event,
        workspace,
        authToken,
      });
    }

    // Track the sale event
    if (subscriptionType === "object.propertyChange") {
      // TODO:
      // Track sale
    }
  }
}
