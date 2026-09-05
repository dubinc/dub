import { prisma } from "@/lib/prisma";
import { StripeMode } from "@/lib/types";

export async function resolveWebhookWorkspace({
  stripeAccountId,
  mode,
}: {
  stripeAccountId?: string | null;
  mode: StripeMode;
}) {
  if (!stripeAccountId) {
    return null;
  }

  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
      stripeConnectId: true,
      defaultProgramId: true,
      webhookEnabled: true,
      stagingWorkspaceId: true,
    },
  });

  if (!workspace) {
    return null;
  }

  // Test/sandbox events still arrive with the live workspace's Connect account.
  // If that workspace has a staging workspace that hasn't connected Stripe
  // itself, route the event there so test data doesn't land on live. Overlay
  // stripeConnectId so handlers can still call Stripe with the connected account.
  if (["test", "sandbox"].includes(mode) && workspace.stagingWorkspaceId) {
    const stagingWorkspace = await prisma.project.findUnique({
      where: {
        id: workspace.stagingWorkspaceId,
      },
      select: {
        id: true,
        stripeConnectId: true,
        defaultProgramId: true,
        webhookEnabled: true,
        stagingWorkspaceId: true,
      },
    });

    if (stagingWorkspace && !stagingWorkspace.stripeConnectId) {
      return {
        ...stagingWorkspace,
        stripeConnectId: stripeAccountId,
      };
    }
  }

  return workspace;
}
