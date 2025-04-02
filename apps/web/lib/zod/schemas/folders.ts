import {
  FOLDER_USER_ROLE,
  FOLDER_WORKSPACE_ACCESS,
} from "@/lib/folder/constants";
import { FolderAccessLevel } from "@/lib/types";
import z from "@/lib/zod";
import { FolderType, FolderUserRole } from "@dub/prisma/client";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";

const workspaceFolderAccess = z
  .enum(
    Object.keys(FOLDER_WORKSPACE_ACCESS) as [
      FolderAccessLevel,
      ...FolderAccessLevel[],
    ],
  )
  .nullish()
  .default(null)
  .describe("The access level of the folder within the workspace.");

export const folderUserRoleSchema = z
  .enum(Object.keys(FOLDER_USER_ROLE) as [FolderUserRole, ...FolderUserRole[]])
  .describe("The role of the user in the folder.");

export const FolderSchema = z.object({
  id: z.string().describe("The unique ID of the folder."),
  name: z.string().describe("The name of the folder."),
  type: z.enum(Object.keys(FolderType) as [FolderType, ...FolderType[]]),
  accessLevel: workspaceFolderAccess,
  linkCount: z
    .number()
    .describe("The number of links in the folder.")
    .default(0),
  createdAt: z.date().describe("The date the folder was created."),
  updatedAt: z.date().describe("The date the folder was updated."),
});

export const createFolderSchema = z.object({
  name: z.string().describe("The name of the folder.").max(190),
  accessLevel: workspaceFolderAccess,
});

export const FOLDERS_MAX_PAGE_SIZE = 50;

export const listFoldersQuerySchema = z
  .object({
    search: z
      .string()
      .optional()
      .describe("The search term to filter the folders by."),
    includeLinkCount: booleanQuerySchema
      .optional()
      .describe("Whether to include the link count in the response."),
  })
  .merge(getPaginationQuerySchema({ pageSize: FOLDERS_MAX_PAGE_SIZE }));

export const updateFolderSchema = createFolderSchema.partial();
