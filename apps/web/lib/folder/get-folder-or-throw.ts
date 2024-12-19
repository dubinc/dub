import { prisma } from "@dub/prisma";
import { DubApiError } from "../api/errors";

export const getFolderOrThrow = async ({
  workspaceId,
  userId,
  folderId,
}: {
  workspaceId: string;
  userId: string;
  folderId: string;
}) => {
  const folder = await prisma.folder.findUnique({
    where: {
      id: folderId,
    },
    select: {
      id: true,
      name: true,
      accessLevel: true,
      createdAt: true,
      updatedAt: true,
      projectId: true,
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
      message: "Folder not found.",
    });
  }

  if (folder.projectId !== workspaceId) {
    throw new Error("Folder does not belong to the workspace.");
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
