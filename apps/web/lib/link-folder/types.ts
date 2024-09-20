import { FolderUser } from "@prisma/client";
import z from "../zod";
import { folderSchema } from "../zod/schemas/folders";
import { FOLDER_WORKSPACE_ACCESS } from "./access";

export type FolderWorkspaceAccess =
  (typeof FOLDER_WORKSPACE_ACCESS)[keyof typeof FOLDER_WORKSPACE_ACCESS];

export type FolderProps = z.infer<typeof folderSchema> & {
  users: FolderUser[];
};
