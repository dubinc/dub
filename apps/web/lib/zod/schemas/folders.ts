import { FOLDER_WORKSPACE_ACCESS } from "@/lib/link-folder/access";
import z from "@/lib/zod";

export const workspaceAccessLevelSchema = z
  .enum(Object.values(FOLDER_WORKSPACE_ACCESS) as [string, ...string[]])
  .default(FOLDER_WORKSPACE_ACCESS.NO_ACCESS)
  .describe("The workspace access level of the folder.");

export const folderSchema = z.object({
  id: z.string().describe("The unique ID of the folder."),
  name: z.string().describe("The name of the folder."),
  accessLevel: workspaceAccessLevelSchema,
  createdAt: z.date().describe("The date the folder was created."),
  updatedAt: z.date().describe("The date the folder was updated."),
});

export const createFolderBodySchema = z.object({
  name: z.string().describe("The name of the folder."),
  accessLevel: workspaceAccessLevelSchema,
});

export const updateFolderBodySchema = createFolderBodySchema;
