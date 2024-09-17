import z from "@/lib/zod";

const accessLevel = z
  .enum(["READ", "WRITE"])
  .describe("The access level of the folder access control.");

const folderAccessControlSchema = z.object({
  accessLevel: accessLevel.nullable(),
  userId: z.string().describe("The unique ID of the user"), // TODO: Maybe we should support the email as well?
});

export const folderSchema = z.object({
  id: z.string().describe("The unique ID of the folder."),
  name: z.string().describe("The name of the folder."),

  createdAt: z.date().describe("The date the folder was created."),
  updatedAt: z.date().describe("The date the folder was updated."),
  // users: z
  //   .array(folderAccessControlSchema)
  //   .describe("The list of users and their access level to the folder.")
  //   .nullable(),
});

export const createFolderBodySchema = z.object({
  name: z.string().describe("The name of the folder."),
  users: z
    .array(folderAccessControlSchema)
    .describe("The list of users and their access level to the folder.")
    .nullish(),
});

export const updateFolderBodySchema = createFolderBodySchema;
