import { Folder, FolderUser } from "@prisma/client";

export type FolderWithPermissions = Folder & {
  users: FolderUser[];
};
