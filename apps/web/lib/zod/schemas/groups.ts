import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";

export const getGroupsQuerySchema = z
  .object({
    search: z
      .string()
      .optional()
      .describe("A search query to filter groups by name, slug.")
      .openapi({ example: "john" }),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string(),
  color: z.string(),
  clickRewardId: z.string().nullable(),
  leadRewardId: z.string().nullable(),
  saleRewardId: z.string().nullable(),
  discountId: z.string().nullable(),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(190),
  slug: z.string().trim().min(1).max(100),
  icon: z.string().nullish(),
  color: z.string().nullish(),
  clickRewardId: z.string().nullish(),
  leadRewardId: z.string().nullish(),
  saleRewardId: z.string().nullish(),
  discountId: z.string().nullish(),
  partnerIds: z.array(z.string()).nullish().default([]),
});
