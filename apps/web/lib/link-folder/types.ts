import { FolderUser } from "@prisma/client";
import z from "../zod";
import { folderSchema } from "../zod/schemas/folders";
import { FOLDER_USER_ROLE, FOLDER_WORKSPACE_ACCESS } from "./constants";

export type FolderWorkspaceAccessLevel = keyof typeof FOLDER_WORKSPACE_ACCESS;

export type FolderUserRole = keyof typeof FOLDER_USER_ROLE;

export type FolderProps = z.infer<typeof folderSchema> & {
  users: FolderUser[];
};
