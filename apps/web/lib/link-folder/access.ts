import { DubApiError } from "../api/errors";
import { FolderProps } from "./types";

export const FOLDER_PERMISSIONS = {
  "folders.links.create": {
    roles: [],
    description: "create links in the folder.",
  },
} as const;

export const canPerformActionOnFolder = ({
  folder,
  userId,
  action,
}: {
  folder: FolderProps;
  userId: string;
  action: keyof typeof FOLDER_PERMISSIONS;
}) => {
  const allowedRoles = FOLDER_PERMISSIONS[action].roles;
  const currentUser = folder.users.find((user) => user.userId === userId);

  // if (!currentUser || !currentUser.accessLevel) {
  //   return false;
  // }

  // @ts-ignore
  return allowedRoles.includes(currentUser.accessLevel);
};

export const throwIfNotAllowed = ({
  folder,
  userId,
  action,
}: {
  folder: FolderProps;
  userId: string;
  action: keyof typeof FOLDER_PERMISSIONS;
}) => {
  const can = canPerformActionOnFolder({ folder, userId, action });
  const permission = FOLDER_PERMISSIONS[action];

  if (!can) {
    throw new DubApiError({
      code: "forbidden",
      message: `You are not allowed to ${permission.description}.`,
    });
  }
};
