import { prisma } from "@dub/prisma";
import { FOLDERS_MAX_PAGE_SIZE } from "../zod/schemas/folders";

export const getFolders = async ({
  workspaceId,
  userId,
  search,
  pageSize = FOLDERS_MAX_PAGE_SIZE,
  page = 1,
}: {
  workspaceId: string;
  userId: string;
  search?: string;
  pageSize?: number;
  page?: number;
}) => {
  return await prisma.folder.findMany({
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
      type: true,
      accessLevel: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: pageSize,
    skip: (page - 1) * pageSize,
  });
};
