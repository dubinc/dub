import { z } from "zod";
import { DiscountSchema } from "./discount";
import { getPaginationQuerySchema } from "./misc";
import { RewardSchema } from "./rewards";

export const DEFAULT_PARTNER_GROUP = {
  name: "Default",
  slug: "default",
  color: "#000000",
} as const;

// This is the standard response we send for all /api/groups/** endpoints
export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string(),
  clickReward: RewardSchema.nullable(),
  leadReward: RewardSchema.nullable(),
  saleReward: RewardSchema.nullable(),
  discount: DiscountSchema.nullable(),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(190),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine((val) => !/^grp_/i.test(val.trim()), {
      message: "Slug cannot start with 'grp_'.",
    }),
  color: z.string().trim(),
});

export const updateGroupSchema = createGroupSchema.partial();

export const changeGroupSchema = z.object({
  partnerIds: z.array(z.string()).min(1),
});

export const getGroupsQuerySchema = z
  .object({
    search: z
      .string()
      .optional()
      .describe("A search query to filter groups by name, slug.")
      .openapi({ example: "john" }),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));
