import { prisma } from "@dub/prisma";

export const getFolders = async ({
  workspaceId,
  userId,
  search,
  includeLinkCount = false,
}: {
  workspaceId: string;
  userId: string;
  includeLinkCount?: boolean;
  search?: string;
}) => {
  const folders = await prisma.folder.findMany({
    where: {
      projectId: workspaceId,
      OR: [
        {
          accessLevel: {
            not: null,
          },
        },
        {
          users: {
            some: {
              userId,
              role: {
                not: null,
              },
            },
          },
        },
      ],
      users: {
        none: {
          userId,
          role: null,
        },
      },
      ...(search && {
        name: {
          contains: search,
        },
      }),
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
    orderBy: {
      createdAt: "asc",
    },
    take: 100,

    // TODO: Add pagination
  });

  return folders.map((folder) => ({
    ...folder,
    ...(includeLinkCount && {
      linkCount: folder._count.links,
    }),
  }));
};
