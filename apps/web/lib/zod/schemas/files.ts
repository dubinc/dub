import z from "@/lib/zod";

export const createFileBodySchema = z.object({
  name: z.string().optional().describe("The name of the file"),
  size: z.number().int().optional().describe("The size of the file in bytes"),
  extension: z.string().optional().describe("The file extension"),
});
