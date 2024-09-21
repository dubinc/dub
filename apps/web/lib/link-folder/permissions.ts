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
}: {
  folder: Folder;
  folderUser: FolderUser | null;
  requiredPermission: (typeof FOLDER_PERMISSIONS)[number];
}) => {
  const can = canPerformActionOnFolder({
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

  if (!permissions.includes(requiredPermission)) {
    return false;
  }

  return true;
};

export const determineFolderUserRole = ({
  folder,
  folderUser,
}: {
  folder: Folder;
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
