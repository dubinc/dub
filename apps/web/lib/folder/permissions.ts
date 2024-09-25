"server-only";

import { FolderUser } from "@prisma/client";
import {
  FOLDER_PERMISSIONS,
  FOLDER_USER_ROLE,
  FOLDER_USER_ROLE_TO_PERMISSIONS,
  FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE,
} from "./constants";
import { Folder } from "./types";

type FolderWithUser = Pick<Folder, "accessLevel"> & {
  user: Pick<FolderUser, "role"> | null;
};

export const getFolderPermissions = (
  role: keyof typeof FOLDER_USER_ROLE | null,
) => {
  if (!role) {
    return [];
  }

  return FOLDER_USER_ROLE_TO_PERMISSIONS[role] || [];
};

export const determineFolderUserRole = ({
  folder,
}: {
  folder: FolderWithUser;
}) => {
  const folderUser = folder.user;

  if (folderUser) {
    return folderUser.role;
  }

  if (!folder.accessLevel) {
    return null;
  }

  return FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE[folder.accessLevel];
};

export const canPerformActionOnFolder = ({
  folder,
  requiredPermission,
}: {
  folder: FolderWithUser | null;
  requiredPermission: (typeof FOLDER_PERMISSIONS)[number];
}) => {
  if (!folder) {
    return false;
  }

  const folderUserRole = determineFolderUserRole({
    folder,
  });

  if (!folderUserRole) {
    return false;
  }

  const permissions = getFolderPermissions(folderUserRole);

  return permissions.includes(requiredPermission);
};
