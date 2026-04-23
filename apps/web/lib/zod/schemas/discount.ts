import { RewardStructure } from "@dub/prisma/client";
import * as z from "zod/v4";
import { getPaginationQuerySchema, maxDurationSchema } from "./misc";

export const DiscountSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.enum(RewardStructure),
  maxDuration: z.number().nullable(),
  couponId: z.string().nullable(),
  couponTestId: z.string().nullable(),
  description: z.string().nullish(),
  partnersCount: z.number().nullish(),
  autoProvisionEnabledAt: z.coerce.date().nullish(),
});

export const DiscountSchemaWithDeprecatedFields = DiscountSchema.omit({
  autoProvisionEnabledAt: true,
})
  .extend({
    duration: z
      .number()
      .nullish()
      .describe("Deprecated: Use `maxDuration` instead"),
    interval: z.string().nullish().describe("Deprecated: Defaults to `month`"),
  })
  .nullish();

export const createDiscountSchema = z.object({
  workspaceId: z.string(),
  amount: z.number().min(0),
  type: z.enum(RewardStructure).default("flat"),
  maxDuration: maxDurationSchema,
  couponId: z.string(),
  couponTestId: z.string().nullish(),
  groupId: z.string(),
  autoProvision: z.boolean().optional(),
});

export const updateDiscountSchema = createDiscountSchema
  .pick({
    workspaceId: true,
    couponTestId: true,
    autoProvision: true,
  })
  .extend({
    discountId: z.string(),
  });

export const discountPartnersQuerySchema = z
  .object({
    discountId: z.string(),
  })
  .extend(getPaginationQuerySchema({ pageSize: 25 }));

export const DiscountCodeSchema = z.object({
  id: z.string().meta({
    description: "The ID of the discount code.",
  }),
  code: z.string().meta({
    description: "The unique human-readable code of the discount code.",
  }),
  discountId: z.string().nullable().meta({
    description: "The ID of the discount that the discount code belongs to.",
  }),
  partnerId: z.string().meta({
    description: "The ID of the partner that the discount code belongs to.",
  }),
  linkId: z.string().meta({
    description: "The ID of the link that the discount code belongs to.",
  }),
});

export const createDiscountCodeSchema = z.object({
  code: z
    .string()
    .max(100, "Code must be less than 100 characters.")
    .optional(),
  partnerId: z.string(),
  linkId: z.string(),
});

export const getDiscountCodesQuerySchema = z.object({
  partnerId: z.string().optional().meta({
    description: "Partner ID to filter by.",
  }),
  tenantId: z.string().optional().meta({
    description: "Tenant ID to filter by.",
  }),
  discountId: z.string().optional().meta({
    description: "Discount ID to filter by.",
  }),
  linkId: z.string().optional().meta({
    description: "Link ID to filter by.",
  }),
});
