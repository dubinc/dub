import { tagColors } from "@/lib/types";
import z from "@/lib/zod";

export const tagColorSchema = z
  .enum(tagColors, {
    errorMap: (issue, ctx) => {
      return {
        message: `Invalid color. Must be one of: ${tagColors.join(", ")}`,
      };
    },
  })
  .describe("The color of the tag");

export const createTagBodySchema = z.object({
  tag: z.string().min(1).describe("The name of the tag to create."),
  color: tagColorSchema
    .optional()
    .describe(
      `The color of the tag. If not provided, a random color will be used from the list: ${tagColors.join(", ")}.`,
    ),
});

export const updateTagBodySchema = z.object({
  name: z.string().min(1),
  color: tagColorSchema.optional(),
});

export const TagSchema = z
  .object({
    id: z.string().describe("The unique ID of the tag."),
    name: z.string().describe("The name of the tag."),
    color: tagColorSchema.describe("The color of the tag."),
  })
  .openapi({
    title: "Tag",
  });
