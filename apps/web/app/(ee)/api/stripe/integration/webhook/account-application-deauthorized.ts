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

  await prisma.$transaction([
    prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        stripeConnectId: null,
        stripeConnectMode: null,
      },
    }),

    prisma.installedIntegration.deleteMany({
      where: {
        projectId: workspace.id,
        integrationId: STRIPE_INTEGRATION_ID,
      },
    }),
  ]);

  return {
    response: `Stripe Connect account ${stripeAccountId} deauthorized for workspace ${workspace.id}`,
  };
}
