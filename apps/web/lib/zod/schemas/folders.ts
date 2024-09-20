import { FOLDER_WORKSPACE_ACCESS } from "@/lib/link-folder/constants";
import z from "@/lib/zod";

export const workspaceAccessLevelSchema = z
  .enum(Object.keys(FOLDER_WORKSPACE_ACCESS) as [string, ...string[]])
  .nullish()
  .default(null)
  .describe("The workspace access level of the folder.");

export const folderSchema = z.object({
  id: z.string().describe("The unique ID of the folder."),
  name: z.string().describe("The name of the folder."),
  accessLevel: workspaceAccessLevelSchema,
  createdAt: z.date().describe("The date the folder was created."),
  updatedAt: z.date().describe("The date the folder was updated."),
});

export const createFolderSchema = z.object({
  name: z.string().describe("The name of the folder."),
  accessLevel: workspaceAccessLevelSchema,
});

export const updateFolderSchema = createFolderSchema.partial();
