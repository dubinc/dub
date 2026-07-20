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

  if (mode === "test" && workspace.stagingWorkspaceId) {
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
