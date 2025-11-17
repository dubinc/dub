import { FraudEventStatus, FraudRuleType } from "@dub/prisma/client";
import { z } from "zod";
import { CommissionSchema } from "./commissions";
import { CustomerSchema } from "./customers";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
import { UserSchema } from "./users";

export const fraudEventSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(FraudRuleType),
  status: z.nativeEnum(FraudEventStatus),
  resolutionReason: z.string().nullable(),
  resolvedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  count: z.number().optional(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
  }).nullable(),
  customer: CustomerSchema.pick({
    id: true,
    name: true,
    email: true,
  }).nullable(),
  commission: CommissionSchema.pick({
    id: true,
    earnings: true,
    currency: true,
    status: true,
  }).nullable(),
  commissions: z
    .array(
      CommissionSchema.pick({
        id: true,
        earnings: true,
        currency: true,
        status: true,
      }),
    )
    .optional(),
  user: UserSchema.pick({
    id: true,
    name: true,
    image: true,
  }).nullable(),
});

export const fraudEventsQuerySchema = z
  .object({
    status: z.nativeEnum(FraudEventStatus).optional(),
    type: z.nativeEnum(FraudRuleType).optional(),
    partnerId: z.string().optional(),
    sortBy: z.enum(["createdAt", "type"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

export const fraudEventCountQuerySchema = fraudEventsQuerySchema
  .omit({
    page: true,
    pageSize: true,
    sortBy: true,
    sortOrder: true,
  })
  .extend({
    groupBy: z.enum(["partnerId", "type"]).optional(),
  });

export const resolveFraudEventSchema = z.object({
  resolutionReason: z
    .string()
    .max(1000, "Reason must be less than 1000 characters")
    .optional()
    .describe("Optional notes explaining the resolution."),
});

export const fraudRuleSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(FraudRuleType),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  config: z.unknown(),
});

export const updateFraudRulesSchema = z.object({
  rules: z.array(
    z.object({
      type: z.nativeEnum(FraudRuleType),
      enabled: z.boolean(),
    }),
  ),
});
