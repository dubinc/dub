import { prisma } from "@/lib/prisma";
import { DubApiError } from "../api/errors";
import {
  FOLDER_PERMISSIONS,
  FOLDER_USER_ROLE,
  FOLDER_USER_ROLE_TO_PERMISSIONS,
  FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE,
} from "./constants";
import { FolderProps } from "./types";

// Only owner can perform action on restricted folder
const isRestrictedFolder = (folder: FolderProps) => {
  return folder.accessLevel === null;
};

export const canPerformActionOnFolder = async ({
  folder,
  userId,
  requiredPermission,
}: {
  folder: FolderProps;
  userId: string;
  requiredPermission: (typeof FOLDER_PERMISSIONS)[number];
}) => {
  const folderUser = await prisma.folderUser.findUnique({
    where: {
      folderId_userId: {
        folderId: folder.id,
        userId,
      },
    },
  });

  const folderUserRole: keyof typeof FOLDER_USER_ROLE | null =
    folderUser?.role ||
    FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE[folder.accessLevel!] ||
    null;

  if (!folderUserRole) {
    return false;
  }

  const permissions = FOLDER_USER_ROLE_TO_PERMISSIONS[folderUserRole];

  if (!permissions.includes(requiredPermission)) {
    return false;
  }

  return true;
};

export const throwIfNotAllowed = async ({
  folder,
  userId,
  requiredPermission,
}: {
  folder: FolderProps;
  userId: string;
  requiredPermission: (typeof FOLDER_PERMISSIONS)[number];
}) => {
  const can = await canPerformActionOnFolder({
    folder,
    userId,
    requiredPermission,
  });

  if (!can) {
    throw new DubApiError({
      code: "forbidden",
      message: `You are not allowed to perform this action on this folder.`,
    });
  }
};
