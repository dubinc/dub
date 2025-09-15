import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { HUBSPOT_CLIENT_SECRET } from "@/lib/integrations/hubspot/constants";
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

    const payload = JSON.parse(rawPayload);

    for (const event of payload) {
      // Find the installation
      const installation = await prisma.installedIntegration.findFirst({
        where: {
          integration: {
            slug: "hubspot",
          },
          credentials: {
            path: "$.hub_id",
            equals: event.portalId,
          },
        },
        include: {
          project: true,
        },
      });

      if (!installation) {
        console.error(
          `HubSpot Installation is not found for portalId ${event.portalId}.`,
        );
        continue;
      }

      const workspace = installation.project;

      switch (event.objectTypeId) {
        case "0-1":
          await trackHubSpotLeadEvent({
            mode: "deferred",
            payload: event,
            workspace,
            authToken: installation.credentials as HubSpotAuthToken,
          });
          break;
      }
    }

    return NextResponse.json({ message: "Webhook received." });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
