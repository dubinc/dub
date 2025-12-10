import { prisma } from "@dub/prisma";
import { Project } from "@dub/prisma/client";
import { getBillingStartDate } from "@dub/utils";

export async function getNetworkInvitesUsage(
  workspace: Pick<Project, "id" | "billingCycleStart">,
) {
  const invites = await prisma.discoveredPartner.aggregate({
    _count: true,
    where: {
      program: {
        workspaceId: workspace.id,
      },
      OR: [
        {
          invitedAt: {
            gt: getBillingStartDate(workspace.billingCycleStart),
          },
        },
        {
          messagedAt: {
            gt: getBillingStartDate(workspace.billingCycleStart),
          },
        },
      ],
    },
  });

  return invites._count;
}
