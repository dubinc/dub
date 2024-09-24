import { prisma } from "@/lib/prisma";
import { FolderUserRole } from "@prisma/client";
import { DubApiError } from "../api/errors";
import { Folder } from "./types";

interface getFolderWithUserProps {
  folderId: string;
  workspaceId: string;
  userId: string;
}

type FolderWithUser = {
  folder: Folder;
  folderUser: {
    role: FolderUserRole | null;
  } | null;
};

export const getFolderWithUserOrThrow = async ({
  folderId,
  workspaceId,
  userId,
}: getFolderWithUserProps): Promise<FolderWithUser> => {
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

  const folderUser = folder.users.length > 0 ? folder.users[0] : null;

  return {
    folder: {
      id: folder.id,
      name: folder.name,
      accessLevel: folder.accessLevel,
      linkCount: folder._count.links,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    },
    folderUser: folderUser ? { role: folderUser.role } : null,
  };
};
