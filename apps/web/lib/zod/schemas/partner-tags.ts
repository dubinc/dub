import * as z from "zod/v4";
import {
  getCursorPaginatedResponseSchema,
  getCursorPaginationQuerySchema,
  getPaginationQuerySchema,
} from "./misc";

export const PARTNER_TAGS_MAX_PAGE_SIZE = 100;
const PARTNER_TAGS_MAX_NAME_LENGTH = 100;

export const PartnerTagSchema = z.object({
  id: z.string().describe("The ID of the partner tag."),
  name: z.string().describe("The name of the partner tag."),
});

export const listPartnerTagsQuerySchema = z.object({
  sortOrder: z
    .enum(["asc", "desc"])
    .optional()
    .default("desc")
    .describe("The order to sort the partner tags by."),
  search: z
    .string()
    .optional()
    .describe("The search term to filter the partner tags by."),
  ids: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",").filter(Boolean)))
    .optional()
    .describe("IDs of partner tags to filter by."),
  pageSize: getPaginationQuerySchema({
    pageSize: PARTNER_TAGS_MAX_PAGE_SIZE,
  }).pageSize,
  ...getCursorPaginationQuerySchema({
    example: "ptag_1KAP4CDPBSVMMBMH9XX3YZZ0Z",
  }),
});

export const getPartnerTagsCountQuerySchema = listPartnerTagsQuerySchema.pick({
  search: true,
});

export const listPartnerTagsResponseSchema =
  getCursorPaginatedResponseSchema(PartnerTagSchema);

export const createPartnerTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(PARTNER_TAGS_MAX_NAME_LENGTH)
    .describe("The name of the partner tag."),
});

export const updatePartnerTagSchema = createPartnerTagSchema.extend({
  partnerTagId: z.string(),
});

export const updatePartnerTagsSchema = z.object({
  workspaceId: z.string(),
  partnerIds: z.array(z.string()),
  addTagIds: z.array(z.string()).optional(),
  removeTagIds: z.array(z.string()).optional(),
});
