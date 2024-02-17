import { tagColors } from "@/lib/types";
import z from "@/lib/zod";

export const tagColorSchema = z
  .enum(tagColors)
  .describe("The color of the tag.");

export const createTagBodySchema = z.object({
  tag: z.string().min(1).describe("The name of the tag to create."),
});

export const updateTagBodySchema = z.object({
  name: z.string().min(1),
  color: tagColorSchema,
});

export const tagSchema = z
  .object({
    id: z.string().describe("The unique ID of the tag."),
    name: z.string().describe("The name of the tag."),
    color: tagColorSchema.describe("The color of the tag."),
  })
  .openapi({
    title: "Tag",
  });
