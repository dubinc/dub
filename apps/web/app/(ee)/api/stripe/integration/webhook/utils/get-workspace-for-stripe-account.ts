import { prisma } from "@/lib/prisma";
import { StripeMode } from "@/lib/types";

export async function getWorkspaceForStripeAccount({
  stripeAccountId,
  mode,
}: {
  stripeAccountId: string;
  mode: StripeMode;
}) {
  const workspaces = await prisma.project.findMany({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
      stripeConnectId: true,
      stripeConnectMode: true,
      defaultProgramId: true,
      webhookEnabled: true,
      environment: true,
    },
  });

  const workspaceInMode = workspaces.find(
    ({ stripeConnectMode }) => stripeConnectMode === mode,
  );

  if (workspaceInMode) {
    return workspaceInMode;
  }

  // Fall back to the only connected workspace so existing single-mode installs keep receiving events
  if (workspaces.length === 1) {
    return workspaces[0];
  }

  return null;
}
