import { z } from "zod";
import { DiscountSchema } from "./discount";
import { getPaginationQuerySchema } from "./misc";
import { RewardSchema } from "./rewards";

export const DEFAULT_PARTNER_GROUP = {
  name: "Default",
  slug: "default",
  color: "#000000",
} as const;

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string(),
  clickRewardId: z.string().nullable(),
  leadRewardId: z.string().nullable(),
  saleRewardId: z.string().nullable(),
  discountId: z.string().nullable(),
  clickReward: RewardSchema.nullish(),
  leadReward: RewardSchema.nullish(),
  saleReward: RewardSchema.nullish(),
  discount: DiscountSchema.nullish(),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(190),
  slug: z.string().trim().min(1).max(100),
  color: z.string().trim(),
});

export const updateGroupSchema = createGroupSchema.partial();

export const getGroupsQuerySchema = z
  .object({
    search: z
      .string()
      .optional()
      .describe("A search query to filter groups by name, slug.")
      .openapi({ example: "john" }),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));
