import { prisma } from "@/lib/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import { StripeWebhookInput, StripeWebhookOutput } from "./utils/types";

// Handle event "account.application.deauthorized"
export async function accountApplicationDeauthorized({
  mode,
  workspace,
}: StripeWebhookInput): Promise<StripeWebhookOutput> {
  if (mode === "test") {
    return {
      response: `Stripe Connect account ${workspace.stripeConnectId} deauthorized in test mode. Skipping...`,
    };
  }

  await prisma.project.update({
    where: {
      stripeConnectId: workspace.stripeConnectId!,
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
    response: `Stripe Connect account ${workspace.stripeConnectId} deauthorized for workspace ${workspace.id}`,
  };
}
