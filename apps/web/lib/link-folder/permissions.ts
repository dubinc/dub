"server-only";

import { FolderUser } from "@prisma/client";
import { DubApiError } from "../api/errors";
import {
  FOLDER_PERMISSIONS,
  FOLDER_USER_ROLE,
  FOLDER_USER_ROLE_TO_PERMISSIONS,
  FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE,
} from "./constants";
import { getFolderWithUser } from "./get-folder";
import { Folder } from "./types";

// export const throwIfFolderActionDenied = ({
//   folder,
//   folderUser,
//   requiredPermission,
//   fromServerAction = false,
// }: {
//   folder: Pick<Folder, "accessLevel">;
//   folderUser: Pick<FolderUser, "role"> | null;
//   requiredPermission: (typeof FOLDER_PERMISSIONS)[number];
//   fromServerAction?: boolean;
// }) => {
//   if (canPerformActionOnFolder({ folder, folderUser, requiredPermission })) {
//     return;
//   }

//   const message = "You are not allowed to perform this action on this folder.";

//   if (fromServerAction) {
//     throw new Error(message);
//   }

//   throw new DubApiError({
//     code: "forbidden",
//     message,
//   });
// };

export const throwIfFolderActionDenied = async ({
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
  const { folder, folderUser } = await getFolderWithUser({
    folderId,
    workspaceId,
    userId,
  });

  if (!canPerformActionOnFolder({ folder, folderUser, requiredPermission })) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not allowed to perform this action on this folder.",
    });
  }
};

export const determineFolderUserRole = ({
  folder,
  folderUser,
}: {
  folder: Pick<Folder, "accessLevel">;
  folderUser: Pick<FolderUser, "role"> | null;
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

export const canPerformActionOnFolder = ({
  folder,
  folderUser,
  requiredPermission,
}: {
  folder: Pick<Folder, "accessLevel">;
  folderUser: Pick<FolderUser, "role"> | null;
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
