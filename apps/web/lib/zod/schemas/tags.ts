import z from "@/lib/zod";

export const CreateTagBodySchema = z.object({
  tag: z.string().min(1).describe("The name of the tag to create."),
});

export const TagSchema = z
  .object({
    id: z.string().describe("The unique ID of the tag."),
    name: z.string().describe("The name of the tag."),
    color: z.string().describe("The color of the tag."),
  })
  .openapi({
    title: "Tag",
  });
