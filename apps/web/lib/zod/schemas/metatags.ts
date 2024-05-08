import z from "@/lib/zod";

export const metaTagsSchema = z.object({
  title: z
    .string()
    .nullable()
    .describe("The meta title tag for the URL.")
    .openapi({
      example: "Dub.co - Link Management for Modern Marketing Teams",
    }),
  description: z
    .string()
    .nullable()
    .describe("The meta description tag for the URL.")
    .openapi({
      example: "Dub.co is the open-source link management infrastructure ...",
    }),
  image: z
    .string()
    .nullable()
    .describe("The OpenGraph image for the URL.")
    .openapi({ example: "https://assets.dub.co/thumbnail.jpg" }),
});
