import { PAID_TRAFFIC_PLATFORMS } from "@/lib/api/fraud/constants";
import {
  FraudAlertStatus,
  FraudEventStatus,
  FraudRuleType,
} from "@dub/prisma/client";
import * as z from "zod/v4";
import { getPaginationQuerySchema } from "./misc";
import { EnrolledPartnerSchema, PartnerSchema } from "./partners";
import { ProgramSchema } from "./programs";
import { UserSchema } from "./users";

export const MAX_RESOLUTION_REASON_LENGTH = 200;

export enum CustomerEmailMatchType {
  EXACT = "exact",
  DOMAIN_MATCH = "domainMatch",
  HISTORICAL_DOMAIN_MATCH = "historicalDomainMatch",
}

export const fraudGroupSchema = z.object({
  id: z.string(),
  type: z.enum(FraudRuleType),
  status: z.enum(FraudEventStatus),
  resolutionReason: z.string().nullable(),
  resolvedAt: z.coerce.date().nullable(),
  lastEventAt: z.coerce.date(),
  eventCount: z.number(),
  partner: EnrolledPartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
    status: true,
  }),
  user: UserSchema.nullable(),
});

export const fraudGroupQuerySchema = z
  .object({
    status: z.enum(FraudEventStatus).optional().default("pending"),
    type: z.enum(FraudRuleType).optional(),
    partnerId: z.string().optional(),
    sortBy: z
      .enum(["lastEventAt", "type", "resolvedAt"])
      .default("lastEventAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    groupId: z.string().optional(),
  })
  .extend(getPaginationQuerySchema({ pageSize: 100 }));

export const fraudGroupCountQuerySchema = fraudGroupQuerySchema
  .omit({
    page: true,
    pageSize: true,
    sortBy: true,
    sortOrder: true,
  })
  .extend({
    groupBy: z.enum(["partnerId", "type"]).optional(),
  });

export const fraudGroupCountSchema = z.union([
  z.object({
    type: z.enum(FraudRuleType),
    _count: z.number(),
  }),

  z.object({
    partnerId: z.string(),
    _count: z.number(),
  }),

  z.number(),
]);

export const fraudEventQuerySchema = z.union([
  z
    .object({
      groupId: z.string(),
    })
    .extend(getPaginationQuerySchema({ pageSize: 25 })),

  z
    .object({
      customerId: z.string(),
      type: z.enum(FraudRuleType),
    })
    .extend(getPaginationQuerySchema({ pageSize: 25 })),
]);

export const fraudEventCountQuerySchema = z.object({
  groupId: z.string(),
});

export const resolveFraudGroupSchema = z.object({
  workspaceId: z.string(),
  groupId: z.string(),
  resolutionReason: z
    .string()
    .max(
      MAX_RESOLUTION_REASON_LENGTH,
      `Reason must be less than ${MAX_RESOLUTION_REASON_LENGTH} characters`,
    )
    .nullable()
    .default(null),
});

export const bulkResolveFraudGroupsSchema = z.object({
  workspaceId: z.string(),
  groupIds: z
    .array(z.string())
    .min(1)
    .max(100, "You can only resolve up to 100 fraud event groups at a time."),
  resolutionReason: z
    .string()
    .max(
      MAX_RESOLUTION_REASON_LENGTH,
      `Reason must be less than ${MAX_RESOLUTION_REASON_LENGTH} characters`,
    )
    .nullable()
    .default(null),
});

export const fraudRuleSchema = z.object({
  id: z.string().optional(),
  type: z.enum(FraudRuleType),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  config: z.unknown(),
});

const toggleOnlyFraudRuleSchema = z
  .object({
    resolvePendingEvents: z.boolean().default(false),
    enabled: z.boolean(),
  })
  .optional();

export const updateFraudRuleSettingsSchema = z.object({
  // Referral source banned rule
  referralSourceBanned: z
    .object({
      resolvePendingEvents: z.boolean().default(false),
      enabled: z.boolean(),
      config: z
        .object({
          domains: z
            .array(z.string())
            .optional()
            .transform((domains) => {
              if (!domains || domains.length === 0) return [];

              // Remove duplicate domains
              return Array.from(
                new Set(
                  domains
                    .map((d) => d.trim().toLowerCase())
                    .filter((d) => d !== ""),
                ),
              );
            }),
        })
        .optional(),
    })
    .transform((data) => {
      // Remove the config if the rule is disabled
      if (!data.enabled) {
        return { ...data, config: undefined };
      }

      // Disable the rule if enabled but has no config
      if (
        data.enabled &&
        (!data.config ||
          !data.config.domains ||
          data.config.domains.length === 0)
      ) {
        return { ...data, enabled: false, config: undefined };
      }

      return data;
    })
    .optional(),

  // Paid traffic detected rule
  paidTrafficDetected: z
    .object({
      resolvePendingEvents: z.boolean().default(false),
      enabled: z.boolean(),
      config: z
        .object({
          platforms: z.array(z.enum(PAID_TRAFFIC_PLATFORMS)).optional(),
          google: z
            .object({
              whitelistedCampaignIds: z
                .array(z.string())
                .optional()
                .transform((ids) => {
                  if (!ids || ids.length === 0) {
                    return [];
                  }

                  return Array.from(
                    new Set(
                      ids.map((id) => id.trim()).filter((id) => id !== ""),
                    ),
                  );
                }),
            })
            .optional(),
        })
        .optional(),
    })
    .transform((data) => {
      // Remove the config if the rule is disabled
      if (!data.enabled) {
        return { ...data, config: undefined };
      }

      // Disable the rule if enabled but has no config
      if (
        data.enabled &&
        (!data.config ||
          !data.config.platforms ||
          data.config.platforms.length === 0)
      ) {
        return { ...data, enabled: false, config: undefined };
      }

      const platforms = data.config?.platforms ?? [];
      const hasGoogle = platforms.includes("google");
      const googleConfig = data.config?.google;

      if (!hasGoogle && googleConfig?.whitelistedCampaignIds?.length) {
        const { google: _google, ...configWithoutGoogle } = data.config ?? {};

        return {
          ...data,
          config: { ...configWithoutGoogle, platforms },
        };
      }

      return data;
    })
    .optional(),

  // Toggle-only rules (no additional config beyond enabled/disabled)
  customerEmailMatch: toggleOnlyFraudRuleSchema,
  customerEmailSuspiciousDomain: toggleOnlyFraudRuleSchema,
  partnerCrossProgramBan: toggleOnlyFraudRuleSchema,
  partnerDuplicateAccount: toggleOnlyFraudRuleSchema,
});

const baseFraudEventSchema = z.object({
  createdAt: z.date(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
  }),
});

const fraudEventCustomerSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullish(),
  avatar: z.string().nullish(),
});

export const fraudEventSchemas = {
  referralSourceBanned: baseFraudEventSchema.extend({
    customer: fraudEventCustomerSchema,
    metadata: z
      .object({
        source: z.string(),
      })
      .nullable(),
  }),

  paidTrafficDetected: baseFraudEventSchema.extend({
    customer: fraudEventCustomerSchema,
    metadata: z
      .object({
        source: z.string(),
        url: z.string().nullable().default(null),
      })
      .nullable(),
  }),

  customerEmailMatch: baseFraudEventSchema.extend({
    customer: fraudEventCustomerSchema,
    metadata: z
      .object({
        matchType: z.enum(CustomerEmailMatchType),
      })
      .nullable()
      .optional(),
  }),

  customerEmailSuspiciousDomain: baseFraudEventSchema.extend({
    customer: fraudEventCustomerSchema,
  }),

  partnerCrossProgramBan: baseFraudEventSchema.extend({
    metadata: z.object({
      bannedAt: z.string(),
      bannedReason: z.string(),
    }),
  }),

  partnerDuplicateAccount: baseFraudEventSchema,
};

export const fraudAlertSchema = z.object({
  id: z.string(),
  reason: z.string(),
  status: z.enum(FraudAlertStatus),
  reviewedAt: z.date().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.date(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
  }),
  program: ProgramSchema.pick({
    id: true,
    name: true,
    logo: true,
  }),
  reviewedBy: UserSchema.pick({
    id: true,
    name: true,
  }).nullable(),
});
