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
        not: null,
      },
    },
  });

  return invites._count;
}
