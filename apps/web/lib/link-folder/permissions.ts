import { Folder, FolderUser } from "@prisma/client";
import { DubApiError } from "../api/errors";
import {
  FOLDER_PERMISSIONS,
  FOLDER_USER_ROLE,
  FOLDER_USER_ROLE_TO_PERMISSIONS,
  FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE,
} from "./constants";

export const throwIfNotAllowed = async ({
  folder,
  folderUser,
  requiredPermission,
}: {
  folder: Folder;
  folderUser: FolderUser | null;
  requiredPermission: (typeof FOLDER_PERMISSIONS)[number];
}) => {
  const can = await canPerformActionOnFolder({
    folder,
    folderUser,
    requiredPermission,
  });

  if (!can) {
    throw new DubApiError({
      code: "forbidden",
      message: `You are not allowed to perform this action on this folder.`,
    });
  }
};

export const canPerformActionOnFolder = async ({
  folder,
  folderUser,
  requiredPermission,
}: {
  folder: Folder;
  folderUser: FolderUser | null;
  requiredPermission: (typeof FOLDER_PERMISSIONS)[number];
}) => {
  const folderUserRole = await getFolderUserRole({
    folder,
    folderUser,
  });

  if (!folderUserRole) {
    return false;
  }

  const permissions = getFolderPermissions(folderUserRole);

  if (!permissions.includes(requiredPermission)) {
    return false;
  }

  return true;
};

export const getFolderUserRole = async ({
  folder,
  folderUser,
}: {
  folder: Folder;
  folderUser: FolderUser | null;
}) => {
  const folderUserRole: keyof typeof FOLDER_USER_ROLE | null =
    folderUser?.role ||
    FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE[folder.accessLevel!] ||
    null;

  return folderUserRole;
};

export const getFolderPermissions = (
  role: keyof typeof FOLDER_USER_ROLE | null,
) => {
  if (!role) {
    return [];
  }

  return FOLDER_USER_ROLE_TO_PERMISSIONS[role] || [];
};
