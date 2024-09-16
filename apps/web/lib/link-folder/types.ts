import { Folder, FolderPermission } from "@prisma/client";

export type FolderWithPermissions = Folder & {
  permissions: FolderPermission[];
};
