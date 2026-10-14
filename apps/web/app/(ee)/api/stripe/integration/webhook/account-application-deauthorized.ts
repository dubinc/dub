import { prisma } from "@/lib/prisma";
import { isProductionEnvironment } from "@/lib/sandbox/environment";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import Stripe from "stripe";
import { WebhookHandlerInput, WebhookHandlerResponse } from "./types";

// Handle event "account.application.deauthorized"
export async function accountApplicationDeauthorized({
  mode,
  workspace,
}: WebhookHandlerInput<Stripe.AccountApplicationDeauthorizedEvent>): Promise<WebhookHandlerResponse> {
  const stripeAccountId = workspace.stripeConnectId!;

  if (mode !== "live" && isProductionEnvironment(workspace.environment)) {
    return {
      response: `Stripe Connect account ${stripeAccountId} deauthorized in ${mode} mode. Skipping...`,
    };
  }

  const disconnected = await prisma.$transaction(async (tx) => {
    // Only disconnect if the workspace is still connected to the deauthorized account
    const { count } = await tx.project.updateMany({
      where: {
        id: workspace.id,
        stripeConnectId: stripeAccountId,
      },
      data: {
        stripeConnectId: null,
        stripeConnectMode: null,
      },
    });

    if (count === 0) {
      return false;
    }

    await tx.installedIntegration.deleteMany({
      where: {
        projectId: workspace.id,
        integrationId: STRIPE_INTEGRATION_ID,
      },
    });

    return true;
  });

  if (!disconnected) {
    return {
      response: `Workspace ${workspace.id} is no longer connected to Stripe Connect account ${stripeAccountId}. Skipping...`,
    };
  }

  return {
    response: `Stripe Connect account ${stripeAccountId} deauthorized for workspace ${workspace.id}`,
  };
}
