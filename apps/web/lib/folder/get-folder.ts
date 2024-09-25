import { prisma } from "@/lib/prisma";
import { DubApiError } from "../api/errors";
import { FOLDER_PERMISSIONS } from "./constants";
import { canPerformActionOnFolder } from "./permissions";

export const getFolder = async ({
  folderId,
  workspaceId,
  userId,
}: {
  folderId: string;
  workspaceId: string;
  userId: string;
}) => {
  const folder = await prisma.folder.findFirst({
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
    return null;
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

export const getFolderOrThrow = async ({
  folderId,
  workspaceId,
  userId,
  requiredPermission,
}: {
  folderId: string;
  workspaceId: string;
  userId: string;
  requiredPermission: (typeof FOLDER_PERMISSIONS)[number];
}) => {
  const folder = await getFolder({
    folderId,
    workspaceId,
    userId,
  });

  if (!folder) {
    throw new DubApiError({
      code: "not_found",
      message: "Folder not found.",
    });
  }

  const canPerformAction = canPerformActionOnFolder({
    folder,
    requiredPermission,
  });

  if (!canPerformAction) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not allowed to perform this action on this folder.",
    });
  }

  return folder;
};
