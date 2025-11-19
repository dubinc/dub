import { PAID_TRAFFIC_PLATFORMS } from "@/lib/api/fraud/constants";
import { FraudEventStatus, FraudRuleType } from "@dub/prisma/client";
import { z } from "zod";
import { CommissionSchema } from "./commissions";
import { CustomerSchema } from "./customers";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
import { UserSchema } from "./users";

export const MAX_RESOLUTION_REASON_LENGTH = 1000;

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
    image: true,
  }),
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
    .max(
      MAX_RESOLUTION_REASON_LENGTH,
      `Reason must be less than ${MAX_RESOLUTION_REASON_LENGTH} characters`,
    )
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

export const referralSourceBannedRule = z.object({
  type: z.literal("referralSourceBanned"),
  enabled: z.boolean(),
  config: z
    .object({
      domains: z.array(z.string()).optional(),
    })
    .optional(),
});

export const paidTrafficDetectedRule = z.object({
  type: z.literal("paidTrafficDetected"),
  enabled: z.boolean(),
  config: z
    .object({
      platforms: z.array(z.enum(PAID_TRAFFIC_PLATFORMS)).optional(),
    })
    .optional(),
});

export const updateFraudRuleSettingsSchema = z.object({
  rules: z.array(
    z.discriminatedUnion("type", [
      referralSourceBannedRule,
      paidTrafficDetectedRule,
    ]),
  ),
});
