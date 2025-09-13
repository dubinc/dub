import { RESOURCE_COLORS } from "@/ui/colors";
import { validSlugRegex } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { z } from "zod";
import { DiscountSchema } from "./discount";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";
import { RewardSchema } from "./rewards";

export const DEFAULT_PARTNER_GROUP = {
  name: "Default Group",
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
  partners: z.number().default(0),
  totalClicks: z.number().default(0),
  totalLeads: z.number().default(0),
  totalSales: z.number().default(0),
  totalSaleAmount: z.number().default(0),
  totalConversions: z.number().default(0),
  totalCommissions: z.number().default(0),
  netRevenue: z.number().default(0),
  partnersCount: z.number().default(0),
});

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(190, "Name is too long. Max 190 characters"),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(
      (val) => {
        const trimmed = val.trim();
        return validSlugRegex.test(trimmed) && !/^grp_/i.test(trimmed);
      },
      {
        message: "Invalid slug format.",
      },
    )
    .transform((val) => slugify(val)),
  color: z.enum(RESOURCE_COLORS).nullable(),
});

export const updateGroupSchema = createGroupSchema.partial();

export const changeGroupSchema = z.object({
  partnerIds: z.array(z.string()).min(1),
});

export const GROUPS_MAX_PAGE_SIZE = 100;

export const getGroupsQuerySchema = z
  .object({
    search: z.string().optional(),
    groupIds: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional(),
    sortBy: z
      .enum([
        "createdAt",
        "partners",
        "totalClicks",
        "totalLeads",
        "totalSales",
        "totalSaleAmount",
        "totalConversions",
        "totalCommissions",
        "netRevenue",
      ])
      .default("totalSaleAmount"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    includeExpandedFields: booleanQuerySchema.optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: GROUPS_MAX_PAGE_SIZE }));

export const getGroupsCountQuerySchema = z.object({
  search: z.string().optional(),
});
