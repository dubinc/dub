import { prisma } from "@dub/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import type Stripe from "stripe";

// Handle event "account.application.deauthorized"
export async function accountApplicationDeauthorized(event: Stripe.Event) {
  const stripeAccountId = event.account;

  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
    },
  });

  if (!workspace) {
    return `Stripe Connect account ${stripeAccountId} deauthorized.`;
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

  return `Stripe Connect account ${stripeAccountId} deauthorized for workspace ${workspace.id}`;
}
