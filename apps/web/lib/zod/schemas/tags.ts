import { tagColors } from "@/lib/types";
import z from "@/lib/zod";
import { getPaginationQuerySchema } from "./misc";

export const TAGS_MAX_PAGE_SIZE = 100;

export const getTagsQuerySchema = z
  .object({
    search: z
      .string()
      .optional()
      .describe("The search term to filter the tags by."),
  })
  .merge(getPaginationQuerySchema({ pageSize: TAGS_MAX_PAGE_SIZE }));

export const getTagsCountQuerySchema = getTagsQuerySchema.omit({
  page: true,
  pageSize: true,
});

export const tagColorSchema = z
  .enum(tagColors, {
    errorMap: (issue, ctx) => {
      return {
        message: `Invalid color. Must be one of: ${tagColors.join(", ")}`,
      };
    },
  })
  .describe("The color of the tag");

export const createTagBodySchema = z
  .object({
    name: z.string().min(1).trim().describe("The name of the tag to create."),
    color: tagColorSchema.describe(
      `The color of the tag. If not provided, a random color will be used from the list: ${tagColors.join(", ")}.`,
    ),
    tag: z
      .string()
      .min(1)
      .trim()
      .describe("The name of the tag to create.")
      .openapi({ deprecated: true }),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (!data.name && !data.tag) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "Name is required.",
      });
    }
  });

export const updateTagBodySchema = createTagBodySchema;

export const TagSchema = z
  .object({
    id: z.string().describe("The unique ID of the tag."),
    name: z.string().describe("The name of the tag."),
    color: tagColorSchema.describe("The color of the tag."),
  })
  .openapi({
    title: "Tag",
  });
