import { prisma } from "@/lib/prisma";
import { isProductionEnvironment } from "@/lib/sandbox/environment";
import { StripeMode } from "@/lib/types";
import Stripe from "stripe";

// Stripe's test mode sandbox shares the live account ID, so test-mode events for a
// production workspace are attributed to its staging workspace when staging has no
// Stripe connection of its own.
export async function resolveWorkspace({
  stripeAccountId,
  eventType,
  mode,
}: {
  stripeAccountId: string;
  eventType: Stripe.Event["type"];
  mode: StripeMode;
}) {
  const connectedWorkspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
      stripeConnectId: true,
      defaultProgramId: true,
      webhookEnabled: true,
      environment: true,
      stagingWorkspaceId: true,
    },
  });

  if (!connectedWorkspace) {
    return null;
  }

  const { stagingWorkspaceId, ...workspace } = connectedWorkspace;

  // Only test-mode events for a production workspace with a staging workspace are
  // diverted. Deauthorization stays on the connected workspace so a test-mode
  // uninstall doesn't disconnect production.
  if (
    mode !== "test" ||
    eventType === "account.application.deauthorized" ||
    !isProductionEnvironment(workspace.environment) ||
    !stagingWorkspaceId
  ) {
    return workspace;
  }

  const stagingWorkspace = await prisma.project.findUnique({
    where: {
      id: stagingWorkspaceId,
    },
    select: {
      id: true,
      stripeConnectId: true,
      defaultProgramId: true,
      webhookEnabled: true,
      environment: true,
    },
  });

  // Keep the event on production if staging is missing or already has its own
  // Stripe connection.
  if (!stagingWorkspace || stagingWorkspace.stripeConnectId) {
    return workspace;
  }

  // Handlers use stripeConnectId for Stripe API calls, so keep the connected account.
  return {
    ...stagingWorkspace,
    stripeConnectId: workspace.stripeConnectId,
  };
}
