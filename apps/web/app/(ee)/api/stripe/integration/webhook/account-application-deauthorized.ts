import { StripeMode } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import type Stripe from "stripe";

// Handle event "account.application.deauthorized"
export async function accountApplicationDeauthorized(
  event: Stripe.AccountApplicationDeauthorizedEvent,
  mode: StripeMode,
) {
  const stripeAccountId = event.account;

  if (mode === "test") {
    return {
      response: `Stripe Connect account ${stripeAccountId} deauthorized in test mode. Skipping...`,
    };
  }

  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
    },
  });

  if (!workspace) {
    return {
      response: `Workspace not found for Stripe account ${stripeAccountId}, skipping...`,
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
    workspaceId: workspace.id,
  };
}
