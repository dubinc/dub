import { PAID_TRAFFIC_PLATFORMS } from "@/lib/api/fraud/constants";
import { FraudEventStatus, FraudRuleType } from "@dub/prisma/client";
import { z } from "zod";
import { CustomerSchema } from "./customers";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
import { ProgramEnrollmentSchema } from "./programs";
import { UserSchema } from "./users";

export const MAX_RESOLUTION_REASON_LENGTH = 200;

export const fraudEventGroupSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(FraudRuleType),
  status: z.nativeEnum(FraudEventStatus),
  resolutionReason: z.string().nullable(),
  resolvedAt: z.date().nullable(),
  lastEventAt: z.date(),
  eventCount: z.number(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
  }),
  user: UserSchema.pick({
    id: true,
    name: true,
    image: true,
  }).nullable(),
});

export const fraudEventGroupQuerySchema = z
  .object({
    status: z.nativeEnum(FraudEventStatus).optional().default("pending"),
    type: z.nativeEnum(FraudRuleType).optional(),
    partnerId: z.string().optional(),
    sortBy: z.enum(["createdAt", "type", "resolvedAt"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    groupId: z.string().optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

export const fraudEventGroupCountQuerySchema = fraudEventGroupQuerySchema
  .omit({
    page: true,
    pageSize: true,
    sortBy: true,
    sortOrder: true,
  })
  .extend({
    groupBy: z.enum(["partnerId", "type"]).optional(),
  });

export const fraudEventGroupCountSchema = z.union([
  z.object({
    type: z.nativeEnum(FraudRuleType),
    _count: z.number(),
  }),

  z.object({
    partnerId: z.string(),
    _count: z.number(),
  }),

  z.number(),
]);

export const fraudEventQuerySchema = z.union([
  z.object({
    groupId: z.string(),
  }),
  z.object({
    customerId: z.string(),
    type: z.nativeEnum(FraudRuleType),
  }),
]);

export const resolveFraudEventGroupSchema = z.object({
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
  groupIds: z.array(z.string()).min(1),
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
  type: z.nativeEnum(FraudRuleType),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  config: z.unknown(),
});

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

      return data;
    })
    .optional(),
});

export const fraudEventSchemas = {
  referralSourceBanned: z.object({
    createdAt: z.date(),
    customer: CustomerSchema.pick({
      id: true,
      name: true,
      email: true,
      avatar: true,
    }),
    metadata: z
      .object({
        source: z.string(),
      })
      .nullable(),
  }),

  paidTrafficDetected: z.object({
    createdAt: z.date(),
    customer: CustomerSchema.pick({
      id: true,
      name: true,
      email: true,
      avatar: true,
    }),
    metadata: z
      .object({
        source: z.string(),
      })
      .nullable(),
  }),

  customerEmailMatch: z.object({
    createdAt: z.date(),
    customer: CustomerSchema.pick({
      id: true,
      name: true,
      email: true,
      avatar: true,
    }),
  }),

  customerEmailSuspiciousDomain: z.object({
    createdAt: z.date(),
    customer: CustomerSchema.pick({
      id: true,
      name: true,
      email: true,
      avatar: true,
    }),
  }),

  partnerCrossProgramBan: ProgramEnrollmentSchema.pick({
    bannedAt: true,
    bannedReason: true,
  }),

  partnerDuplicatePayoutMethod: z.object({
    createdAt: z.date(),
    partner: PartnerSchema.pick({
      id: true,
      name: true,
      email: true,
      image: true,
    }),
  }),

  partnerFraudReport: z.object({
    createdAt: z.date(),
    partner: PartnerSchema.pick({
      id: true,
      name: true,
      email: true,
      image: true,
    }),
  }),
};
