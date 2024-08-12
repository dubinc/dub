import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

// Handle event "account.application.deauthorized"
export async function accountApplicationDeauthorized(event: Stripe.Event) {
  const stripeAccountId = event.account;

  const workspace = await prisma.project.update({
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
      integration: {
        slug: "stripe",
      },
    },
  });

  return `Stripe Connect account ${stripeAccountId} deauthorized for workspace ${workspace.id}`;
}
