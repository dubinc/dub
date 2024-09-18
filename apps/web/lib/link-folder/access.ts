import { DubApiError } from "../api/errors";
import { FolderWithPermissions } from "./types";

export const FOLDER_ROLES = {
  OWNER: "owner",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

export const FOLDER_PERMISSIONS = {
  "folders.links.create": {
    roles: [FOLDER_ROLES.OWNER, FOLDER_ROLES.MEMBER],
    description: "create links in the folder.",
  },

  "folders.users.add": {
    roles: [FOLDER_ROLES.OWNER],
    description: "add users to the folder.",
  },

  "folders.users.remove": {
    roles: [FOLDER_ROLES.OWNER],
    description: "remove users from the folder.",
  },

  "folders.update": {
    roles: [FOLDER_ROLES.OWNER],
    description: "update the folder.",
  },

  "folders.delete": {
    roles: [FOLDER_ROLES.OWNER],
    description: "delete the folder.",
  },

  "folders.read": {
    roles: [FOLDER_ROLES.OWNER, FOLDER_ROLES.MEMBER, FOLDER_ROLES.VIEWER],
    description: "read the folder.",
  },
} as const;

export const canPerformActionOnFolder = ({
  folder,
  userId,
  action,
}: {
  folder: FolderWithPermissions;
  userId: string;
  action: keyof typeof FOLDER_PERMISSIONS;
}) => {
  const allowedRoles = FOLDER_PERMISSIONS[action].roles;
  const currentUser = folder.users.find((user) => user.userId === userId);

  if (!currentUser || !currentUser.accessLevel) {
    return false;
  }

  // @ts-ignore
  return allowedRoles.includes(currentUser.accessLevel);
};

export const throwIfNotAllowed = ({
  folder,
  userId,
  action,
}: {
  folder: FolderWithPermissions;
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
