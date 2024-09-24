import { prisma } from "@/lib/prisma";
import { DubApiError } from "../api/errors";

export const getFolderOrThrow = async ({
  folderId,
  workspaceId,
  userId,
}: {
  folderId: string;
  workspaceId: string;
  userId: string;
}) => {
  const folder = await prisma.folder.findUniqueOrThrow({
    where: {
      id: folderId,
      projectId: workspaceId,
    },
    select: {
      id: true,
      name: true,
      accessLevel: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          links: true,
        },
      },
      users: {
        where: {
          userId,
        },
      },
    },
  });

  if (!folder) {
    throw new DubApiError({
      code: "not_found",
      message: "Folder not found in the workspace.",
    });
  }

  return {
    id: folder.id,
    name: folder.name,
    accessLevel: folder.accessLevel,
    linkCount: folder._count.links,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
    user: folder.users.length > 0 ? folder.users[0] : null,
  };
};
