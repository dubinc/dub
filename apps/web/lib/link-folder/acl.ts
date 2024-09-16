import { FolderWithPermissions } from "./types";

export const AccessLevel = {
  OWNER: "owner",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

export const canUpdateFolder = ({
  folder,
  userId,
}: {
  folder: FolderWithPermissions;
  userId: string;
}) => {
  const currentUser = folder.permissions.find((p) => p.userId === userId);

  if (!currentUser) {
    return false;
  }

  return currentUser.accessLevel === AccessLevel.OWNER;
};
