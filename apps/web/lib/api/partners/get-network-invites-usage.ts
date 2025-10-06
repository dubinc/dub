import { prisma } from "@dub/prisma";

export async function getNetworkInvitesUsage({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const invites = await prisma.discoveredPartner.aggregate({
    _count: true,
    where: {
      program: {
        workspaceId,
      },
      invitedAt: {
        gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  return invites._count;
}
