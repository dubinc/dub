import z from "@/lib/zod";

export const metaTagsSchema = z.object({
  title: z.string().nullable().describe("The meta title tag for the URL"),
  description: z
    .string()
    .nullable()
    .describe("The meta description tag for the URL"),
  image: z.string().nullable().describe("The OpenGraph image for the URL"),
});