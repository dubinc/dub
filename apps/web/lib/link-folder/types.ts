import { FolderUserRole, User } from "@prisma/client";
import z from "../zod";
import { folderSchema } from "../zod/schemas/folders";
import { FOLDER_WORKSPACE_ACCESS } from "./constants";

export type FolderWorkspaceAccessLevel = keyof typeof FOLDER_WORKSPACE_ACCESS;

export type FolderUserProps = Pick<User, "id" | "name" | "email" | "image"> & {
  role: FolderUserRole;
};

export type FolderProps = z.infer<typeof folderSchema>;

export type FolderWithRole = z.infer<typeof folderSchema> & {
  role: FolderUserRole | null;
};
