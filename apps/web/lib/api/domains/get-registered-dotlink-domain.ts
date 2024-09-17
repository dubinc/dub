import { prisma } from "@/lib/prisma";

export async function getRegisteredDotlinkDomain(workspaceId: string) {
  return prisma.registeredDomain.findFirst({
    where: {
      projectId: workspaceId,
      slug: {
        endsWith: ".link",
      },
    },
  });
}
