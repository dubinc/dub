import z from "@/lib/zod";

export const folderSchema = z.object({
  id: z.string().describe("The unique ID of the folder."),
  name: z.string().describe("The name of the folder."),
});

export const createFolderBodySchema = z.object({
  name: z.string().describe("The name of the folder."),
});

export const updateFolderBodySchema = createFolderBodySchema;
