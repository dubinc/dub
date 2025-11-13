import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";

export const PARTNER_TAGS_MAX_PAGE_SIZE = 100;

export const getPartnerTagsQuerySchema = z
  .object({
    sortBy: z
      .enum(["name", "createdAt"])
      .optional()
      .default("name")
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
  .merge(getPaginationQuerySchema({ pageSize: PARTNER_TAGS_MAX_PAGE_SIZE }));

export const PartnerTagSchema = z.object({
  id: z.string(),
  name: z.string(),
});
