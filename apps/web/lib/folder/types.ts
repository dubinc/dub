import { FolderUserRole, User } from "@prisma/client";
import z from "../zod";
import { folderSchema } from "../zod/schemas/folders";
import { FOLDER_PERMISSIONS, FOLDER_WORKSPACE_ACCESS } from "./constants";

export type Folder = z.infer<typeof folderSchema>;

export type FolderAccessLevel = keyof typeof FOLDER_WORKSPACE_ACCESS;

export type FolderPermission = (typeof FOLDER_PERMISSIONS)[number];

export type FolderUser = Pick<User, "id" | "name" | "email" | "image"> & {
  role: FolderUserRole;
};

export type FolderWithPermissions = {
  id: string;
  permissions: FolderPermission[];
};
