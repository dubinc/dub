import { uninstallIntegration } from "@/lib/api/integration/uninstall";
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

  await uninstallIntegration({
    integrationSlug: "stripe",
    workspaceId: workspace.id,
  });

  return `Stripe Connect account ${stripeAccountId} deauthorized for workspace ${workspace.id}`;
}
