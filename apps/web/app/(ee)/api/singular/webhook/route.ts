import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { normalizeWorkspaceId } from "@/lib/api/workspace-id";
import { trackSingularLeadEvent } from "@/lib/integrations/singular/track-lead";
import { trackSingularSaleEvent } from "@/lib/integrations/singular/track-sale";
import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";
import { z } from "zod";

const singularToDubEvent = {
  activated: "lead",
  sng_complete_registration: "lead",
  sng_subscribe: "sale",
  sng_ecommerce_purchase: "sale",
  __iap__: "sale", // In-app purchase
  "Copy GAID": "lead", // Singular Device Assist
  "copy IDFA": "lead", // Singular Device Assist
};

const supportedEvents = Object.keys(singularToDubEvent);

const authSchema = z.object({
  dub_token: z
    .string()
    .min(1, "dub_token is required")
    .describe("Global token to identify Singular events."),
  dub_workspace_id: z
    .string()
    .min(1, "dub_workspace_id is required")
    .describe(
      "The Singular advertiser's workspace ID on Dub (see https://d.to/id).",
    )
    .transform((v) => normalizeWorkspaceId(v)),
});

const singularWebhookToken = process.env.SINGULAR_WEBHOOK_TOKEN;

// GET /api/singular/webhook – listen to Postback events from Singular
export const GET = withAxiom(async (req: AxiomRequest) => {
  try {
    if (!singularWebhookToken) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "SINGULAR_WEBHOOK_TOKEN is not set in the environment variables.",
      });
    }

    const queryParams = getSearchParams(req.url);

    const { dub_token: token, dub_workspace_id: workspaceId } =
      authSchema.parse(queryParams);

    if (token !== singularWebhookToken) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Invalid Singular webhook token. Skipping event processing.",
      });
    }

    const { event_name: eventName } = queryParams;

    if (!eventName) {
      throw new DubApiError({
        code: "bad_request",
        message: "event_name is required.",
      });
    }

    if (!supportedEvents.includes(eventName)) {
      console.error(
        `Event ${eventName} is not supported by Singular <> Dub integration.`,
      );

      return NextResponse.json("OK");
    }

    const workspace = await prisma.project.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        stripeConnectId: true,
        webhookEnabled: true,
      },
    });

    if (!workspace) {
      throw new DubApiError({
        code: "not_found",
        message: `Workspace ${workspaceId} not found.`,
      });
    }

    const dubEvent = singularToDubEvent[eventName];

    delete queryParams.dub_token;
    delete queryParams.dub_workspace_id;

    if (dubEvent === "lead") {
      await trackSingularLeadEvent({
        queryParams,
        workspace,
      });
    } else if (dubEvent === "sale") {
      await trackSingularSaleEvent({
        queryParams,
        workspace,
      });
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});

export const HEAD = () => {
  return new Response("OK");
};
