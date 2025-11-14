import {
  FraudEventStatus,
  FraudRiskLevel,
  FraudRuleType,
} from "@dub/prisma/client";
import { z } from "zod";
import { CommissionSchema } from "./commissions";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
import { UserSchema } from "./users";

export const FRAUD_EVENTS_MAX_PAGE_SIZE = 100;

export const fraudEventSchema = z.object({
  id: z.string(),
  riskLevel: z.nativeEnum(FraudRiskLevel),
  riskScore: z.number(),
  triggeredRules: z.any(), // JSON field
  resolutionReason: z.string().nullable(),
  resolvedAt: z.date().nullable(),
  status: z.nativeEnum(FraudEventStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: UserSchema.pick({
    id: true,
    name: true,
    email: true,
  }).nullable(),
  partner: PartnerSchema.pick({
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
});

export const fraudEventListQuerySchema = z
  .object({
    status: z
      .nativeEnum(FraudEventStatus)
      .optional()
      .describe("Filter fraud events by status."),
    riskLevel: z
      .nativeEnum(FraudRiskLevel)
      .optional()
      .describe("Filter fraud events by risk level."),
    partnerId: z
      .string()
      .optional()
      .describe("Filter fraud events by partner ID."),
    sortBy: z
      .enum(["createdAt", "riskScore", "riskLevel"])
      .default("createdAt")
      .describe("The field to sort the fraud events by."),
    sortOrder: z
      .enum(["asc", "desc"])
      .default("desc")
      .describe("The sort order."),
  })
  .merge(getPaginationQuerySchema({ pageSize: FRAUD_EVENTS_MAX_PAGE_SIZE }));

export const fraudEventCountQuerySchema = fraudEventListQuerySchema
  .omit({
    page: true,
    pageSize: true,
    sortBy: true,
    sortOrder: true,
  })
  .extend({
    groupBy: z.enum(["status", "riskLevel"]).optional(),
  });

export const resolveFraudEventSchema = z.object({
  status: z
    .enum(["safe", "banned"])
    .describe("The resolution status for the fraud event."),
  resolutionReason: z
    .string()
    .max(1000, "Reason must be less than 1000 characters")
    .optional()
    .describe("Optional notes explaining the resolution."),
  markPartnerAsSafe: z
    .boolean()
    .optional()
    .describe(
      "Whether to mark the partner as safe for all future fraud events.",
    ),
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
