import { tagColors } from "@/lib/types";
import z from "@/lib/zod";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";

export const TAGS_MAX_PAGE_SIZE = 100;

export const getTagsQuerySchema = z
  .object({
    sortBy: z
      .enum(["name", "createdAt"])
      .optional()
      .default("name")
      .describe("The field to sort the tags by."),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .default("asc")
      .describe("The order to sort the tags by."),
    search: z
      .string()
      .optional()
      .describe("The search term to filter the tags by."),
    ids: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional()
      .describe("IDs of tags to filter by."),
  })
  .merge(getPaginationQuerySchema({ pageSize: TAGS_MAX_PAGE_SIZE }));

export const getTagsQuerySchemaExtended = getTagsQuerySchema.merge(
  z.object({
    // Only Dub UI uses the following query parameters
    includeLinksCount: booleanQuerySchema.default("false"),
  }),
);

export const getTagsCountQuerySchema = getTagsQuerySchema.omit({
  ids: true,
  page: true,
  pageSize: true,
});

export const tagColorSchema = z
  .enum(tagColors, {
    errorMap: () => {
      return {
        message: `Invalid color. Must be one of: ${tagColors.join(", ")}`,
      };
    },
  })
  .describe("The color of the tag");

export const createTagBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .describe("The name of the tag to create."),
    color: tagColorSchema.describe(
      `The color of the tag. If not provided, a random color will be used from the list: ${tagColors.join(", ")}.`,
    ),
    tag: z
      .string()
      .trim()
      .min(1)
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
