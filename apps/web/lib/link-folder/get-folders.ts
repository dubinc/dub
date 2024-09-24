import { prisma } from "@/lib/prisma";

export const getFolders = async ({
  workspaceId,
  userId,
  includeLinkCount = false,
}: {
  workspaceId: string;
  userId: string;
  includeLinkCount?: boolean;
}) => {
  const folders = await prisma.folder.findMany({
    where: {
      projectId: workspaceId,
      OR: [
        { accessLevel: { not: null } },
        {
          users: {
            some: {
              userId,
              role: { not: null },
            },
          },
        },
      ],
      NOT: {
        users: {
          some: {
            userId,
            role: null,
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      accessLevel: true,
      createdAt: true,
      updatedAt: true,

      ...(includeLinkCount && {
        _count: {
          select: {
            links: true,
          },
        },
      }),
    },
  });

  return folders.map((folder) => ({
    ...folder,
    ...(includeLinkCount && {
      linkCount: folder._count.links,
    }),
  }));
};
