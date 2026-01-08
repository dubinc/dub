import * as z from "zod/v4";
import { getPaginationQuerySchema } from "./misc";

export const PARTNER_TAGS_MAX_PAGE_SIZE = 100;

export const getPartnerTagsQuerySchema = z
  .object({
    sortBy: z
      .enum(["name", "createdAt"])
      .optional()
      .default("createdAt")
      .describe("The field to sort the partner tags by."),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .default("asc")
      .describe("The order to sort the partner tags by."),
    search: z
      .string()
      .optional()
      .describe("The search term to filter the partner tags by."),
    ids: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional()
      .describe("IDs of partner tags to filter by."),
  })
  .extend(getPaginationQuerySchema({ pageSize: PARTNER_TAGS_MAX_PAGE_SIZE }));

export const getPartnerTagsCountQuerySchema = getPartnerTagsQuerySchema.omit({
  page: true,
  pageSize: true,
});

export const PartnerTagSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const updatePartnerTagsSchema = z.object({
  workspaceId: z.string(),
  partnerIds: z.array(z.string()),
  addTagIds: z.array(z.string()).optional(),
  removeTagIds: z.array(z.string()).optional(),
});

export const createPartnerTagSchema = z.object({
  workspaceId: z.string(),
  name: z.string(),
});

export const updatePartnerTagSchema = createPartnerTagSchema.extend({
  partnerTagId: z.string(),
});

export const deletePartnerTagSchema = z.object({
  workspaceId: z.string(),
  partnerTagId: z.string(),
});
