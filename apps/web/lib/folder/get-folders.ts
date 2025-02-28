import { prisma } from "@dub/prisma";
import { FOLDERS_MAX_PAGE_SIZE } from "../zod/schemas/folders";

export const getFolders = async ({
  workspaceId,
  userId,
  search,
  includeLinkCount = false,
  pageSize = FOLDERS_MAX_PAGE_SIZE,
  page = 1,
}: {
  workspaceId: string;
  userId: string;
  includeLinkCount?: boolean;
  search?: string;
  pageSize?: number;
  page?: number;
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
    take: pageSize,
    skip: (page - 1) * pageSize,
  });

  return folders.map((folder) => ({
    ...folder,
    ...(includeLinkCount && {
      linkCount: folder._count.links,
    }),
  }));
};
