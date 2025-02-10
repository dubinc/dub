"server-only";

import { Folder, FolderPermission } from "@/lib/types";
import { FolderUser } from "@dub/prisma/client";
import { DubApiError } from "../api/errors";
import {
  FOLDER_USER_ROLE,
  FOLDER_USER_ROLE_TO_PERMISSIONS,
  FOLDER_WORKSPACE_ACCESS_TO_FOLDER_USER_ROLE,
} from "./constants";
import { getFolderOrThrow } from "./get-folder-or-throw";

export const verifyFolderAccess = async ({
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
  const folder = await getFolderOrThrow({
    folderId,
    workspaceId,
    userId,
  });

  const folderUserRole = findUserFolderRole({
    folder,
    user: folder.user,
  });

  if (!folderUserRole) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not allowed to perform this action on this folder.",
    });
  }

  const permissions = getFolderPermissions(folderUserRole);

  if (!permissions.includes(requiredPermission)) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not allowed to perform this action on this folder.",
    });
  }

  return folder;
};

// Get the permissions for a folder for a given user role
export const getFolderPermissions = (
  role: keyof typeof FOLDER_USER_ROLE | null,
) => {
  if (!role) {
    return [];
  }

  return FOLDER_USER_ROLE_TO_PERMISSIONS[role] || [];
};

export const findUserFolderRole = ({
  folder,
  user,
}: {
  folder: Pick<Folder, "accessLevel">;
  user: Pick<FolderUser, "role"> | null;
}) => {
  if (user) {
    return user.role;
  }

  if (!folder.accessLevel) {
    return null;
  }

  return FOLDER_WORKSPACE_ACCESS_TO_FOLDER_USER_ROLE[folder.accessLevel];
};
