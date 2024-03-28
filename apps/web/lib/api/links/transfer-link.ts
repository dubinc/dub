import prisma from "@/lib/prisma";

export async function transferLink({
  linkId,
  newWorkspaceId,
}: {
  linkId: string;
  newWorkspaceId: string;
}) {
  return await prisma.link.update({
    where: {
      id: linkId,
    },
    data: {
      projectId: newWorkspaceId,
      // remove tags when transferring link
      tags: {
        deleteMany: {},
      },
    },
  });
}
