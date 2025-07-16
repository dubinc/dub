import z from "@/lib/zod";

export const createFileBodySchema = z.object({
  name: z.string().optional().describe("The name of the file"),
  size: z.number().int().optional().describe("The size of the file in bytes"),
  extension: z.string().optional().describe("The file extension"),
});

export const FileSchema = z.object({
  id: z.string().describe("The unique ID of the file"),
  name: z.string().nullable().describe("The name of the file"),
  size: z.number().int().nullable().describe("The size of the file in bytes"),
  extension: z.string().nullable().describe("The file extension"),
  createdAt: z.date().describe("The date the file was created"),
  updatedAt: z.date().describe("The date the file was last updated"),
}); 