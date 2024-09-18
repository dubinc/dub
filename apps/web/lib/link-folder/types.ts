import { Folder, FolderUser } from "@prisma/client";
import { FOLDER_WORKSPACE_ACCESS } from "./access";

export type FolderWithPermissions = Folder & {
  users: FolderUser[];
};

export type FolderWorkspaceAccess =
  (typeof FOLDER_WORKSPACE_ACCESS)[keyof typeof FOLDER_WORKSPACE_ACCESS];
