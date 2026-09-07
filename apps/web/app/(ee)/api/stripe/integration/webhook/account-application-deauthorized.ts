import { prisma } from "@/lib/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import Stripe from "stripe";
import { WebhookHandlerInput, WebhookHandlerResponse } from "./types";

// Handle event "account.application.deauthorized"
export async function accountApplicationDeauthorized({
  event,
  mode,
  workspace,
}: WebhookHandlerInput<Stripe.AccountApplicationDeauthorizedEvent>): Promise<WebhookHandlerResponse> {
  const stripeAccountId = workspace.stripeConnectId!;

  if (mode === "test") {
    return {
      response: `Stripe Connect account ${stripeAccountId} deauthorized in test mode. Skipping...`,
    };
  }

  await prisma.project.update({
    where: {
      stripeConnectId: stripeAccountId,
    },
    data: {
      stripeConnectId: null,
    },
    select: {
      id: true,
    },
  });

  await prisma.installedIntegration.deleteMany({
    where: {
      projectId: workspace.id,
      integrationId: STRIPE_INTEGRATION_ID,
    },
  });

  return {
    response: `Stripe Connect account ${stripeAccountId} deauthorized for workspace ${workspace.id}`,
  };
}
