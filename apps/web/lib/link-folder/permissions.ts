"server-only";

import { prisma } from "@/lib/prisma";
import { Folder, FolderUser } from "@prisma/client";
import { DubApiError } from "../api/errors";
import {
  FOLDER_PERMISSIONS,
  FOLDER_USER_ROLE,
  FOLDER_USER_ROLE_TO_PERMISSIONS,
  FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE,
} from "./constants";

export const throwIfNotAllowed = ({
  folder,
  folderUser,
  requiredPermission,
  fromServerAction = false,
}: {
  folder: Folder;
  folderUser: FolderUser | null;
  requiredPermission: (typeof FOLDER_PERMISSIONS)[number];
  fromServerAction?: boolean;
}) => {
  if (canPerformActionOnFolder({ folder, folderUser, requiredPermission })) {
    return;
  }

  const message = "You are not allowed to perform this action on this folder.";

  if (fromServerAction) {
    throw new Error(message);
  }

  throw new DubApiError({
    code: "forbidden",
    message,
  });
};

export const canPerformActionOnFolder = ({
  folder,
  folderUser,
  requiredPermission,
}: {
  folder: Folder;
  folderUser: FolderUser | null;
  requiredPermission: (typeof FOLDER_PERMISSIONS)[number];
}) => {
  const folderUserRole = determineFolderUserRole({
    folder,
    folderUser,
  });

  if (!folderUserRole) {
    return false;
  }

  const permissions = getFolderPermissions(folderUserRole);

  return permissions.includes(requiredPermission);
};

export const determineFolderUserRole = ({
  folder,
  folderUser,
}: {
  folder: Pick<Folder, "accessLevel">;
  folderUser: FolderUser | null;
}) => {
  if (folderUser) {
    return folderUser.role;
  }

  if (!folder.accessLevel) {
    return null;
  }

  return FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE[folder.accessLevel];
};

export const getFolderPermissions = (
  role: keyof typeof FOLDER_USER_ROLE | null,
) => {
  if (!role) {
    return [];
  }

  return FOLDER_USER_ROLE_TO_PERMISSIONS[role] || [];
};

export async function throwIfInvalidFolderAccess({
  folderId,
  workspaceId,
  userId,
  requiredPermission,
}: {
  folderId: string;
  workspaceId: string;
  userId: string;
  requiredPermission: (typeof FOLDER_PERMISSIONS)[number];
}) {
  const folder = await prisma.folder.findFirst({
    where: {
      id: folderId,
      projectId: workspaceId,
    },
    include: {
      users: true,
    },
  });

  if (!folder) {
    throw new DubApiError({
      code: "not_found",
      message: "Folder not found in the workspace.",
    });
  }

  const folderUser =
    folder.users.find((user) => user.userId === userId) || null;

  if (!canPerformActionOnFolder({ folder, folderUser, requiredPermission })) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not allowed to perform this action on this folder.",
    });
  }
}
