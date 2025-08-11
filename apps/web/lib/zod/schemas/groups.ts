import { z } from "zod";
import { DiscountSchema } from "./discount";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";
import { RewardSchema } from "./rewards";

export const DEFAULT_PARTNER_GROUP = {
  name: "Default",
  slug: "default",
  color: null,
} as const;

// This is the standard response we send for all /api/groups/** endpoints
export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string().nullable(),
  clickReward: RewardSchema.nullish(),
  leadReward: RewardSchema.nullish(),
  saleReward: RewardSchema.nullish(),
  discount: DiscountSchema.nullish(),
});

export const GroupSchemaExtended = GroupSchema.extend({
  clicks: z.number().default(0),
  leads: z.number().default(0),
  sales: z.number().default(0),
  saleAmount: z.number().default(0),
  conversions: z.number().default(0),
  commissions: z.number().default(0),
  netRevenue: z.number().default(0),
  partnersCount: z.number().default(0),
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
  color: z.string().trim().nullable(),
});

export const updateGroupSchema = createGroupSchema.partial();

export const changeGroupSchema = z.object({
  partnerIds: z.array(z.string()).min(1),
});

export const getGroupsQuerySchema = z
  .object({
    search: z.string().optional(),
    sortBy: z
      .enum([
        "createdAt",
        "clicks",
        "leads",
        "sales",
        "saleAmount",
        "conversions",
        "commissions",
        "netRevenue",
      ])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    includeExpandedFields: booleanQuerySchema.optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

export const getGroupsCountQuerySchema = z.object({
  search: z.string().optional(),
});
