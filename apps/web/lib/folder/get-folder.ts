import { prisma } from "@/lib/prisma";
import { DubApiError } from "../api/errors";
import { canPerformActionOnFolder } from "./permissions";
import { FolderPermission } from "./types";

export const getFolder = async ({
  workspaceId,
  userId,
  folderId,
}: {
  workspaceId: string;
  userId: string;
  folderId: string;
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
  workspaceId,
  userId,
  folderId,
  requiredPermission,
}: {
  workspaceId: string;
  userId: string;
  folderId: string;
  requiredPermission: FolderPermission;
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
