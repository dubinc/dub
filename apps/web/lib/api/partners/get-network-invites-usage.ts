import { prisma } from "@dub/prisma";
import { getBillingStartDate } from "@dub/utils";
import { Project } from "@prisma/client";

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
