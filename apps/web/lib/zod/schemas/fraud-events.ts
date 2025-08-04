import { DATE_RANGE_INTERVAL_PRESETS } from "@/lib/analytics/constants";
import { FraudEventStatus } from "@dub/prisma/client";
import { z } from "zod";
import { CommissionSchema } from "./commissions";
import { CustomerSchema } from "./customers";
import { LinkSchema } from "./links";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
import { UserSchema } from "./users";
import { parseDateSchema } from "./utils";

export const fraudEventTypeSchema = z.enum([
  "selfReferral",
  "googleAdsClick",
  "disposableEmail",
]);

export const FRAUD_EVENT_TYPES = {
  selfReferral: {
    label: "Self referral",
    description:
      "The user referred themselves to exploit the referral program.",
  },
  googleAdsClick: {
    label: "Google ads click",
    description:
      "Traffic from Google Ads flagged as potentially invalid or fraudulent.",
  },
  disposableEmail: {
    label: "Disposable email",
    description: "Email address is from a temporary or disposable provider.",
  },
} as const;

export const FRAUD_EVENT_SAFE_REASONS = {
  cleared_after_manual_review: "Cleared after manual review",
  no_self_referrals_found: "No self-referrals found",
  no_google_ads_activity_detected: "No Google Ads activity detected",
  email_domain_verified_and_unrelated: "Email domain verified and unrelated",
} as const;

export const FRAUD_EVENT_BAN_REASONS = {
  banned_after_manual_review: "Banned after manual review",
  self_referrals_detected: "Self-referrals detected",
  unauthorized_google_ads_activity: "Unauthorized Google Ads activity",
  matching_email_domain_with_referred_customer:
    "Matching email domain with referred customer",
} as const;

export const FRAUD_EVENT_RESOLUTION_REASONS = {
  ...FRAUD_EVENT_SAFE_REASONS,
  ...FRAUD_EVENT_BAN_REASONS,
} as const;

export const FraudEventSchema = z.object({
  id: z.string(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
  }),
  customer: CustomerSchema.pick({
    id: true,
    email: true,
    avatar: true,
  }).nullable(),
  link: LinkSchema.pick({
    id: true,
    url: true,
    shortLink: true,
  }),
  commissions: z
    .array(
      CommissionSchema.pick({
        id: true,
        earnings: true,
      }),
    )
    .nullable(),
  selfReferral: z.boolean(),
  googleAdsClick: z.boolean(),
  disposableEmail: z.boolean(),
  details: z.any().nullable(),
  status: z.nativeEnum(FraudEventStatus),
  user: UserSchema.nullable(),
  resolutionReason: z.string().nullable(),
  resolvedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const getFraudEventsQuerySchema = z
  .object({
    status: z.nativeEnum(FraudEventStatus).optional(),
    type: fraudEventTypeSchema.optional(),
    interval: z.enum(DATE_RANGE_INTERVAL_PRESETS).default("all"),
    start: parseDateSchema.optional(),
    end: parseDateSchema.optional(),
    partnerId: z.string().optional(),
    fraudEventId: z.string().optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

export const fraudEventsCountQuerySchema = getFraudEventsQuerySchema
  .pick({
    status: true,
    type: true,
    interval: true,
    start: true,
    end: true,
  })
  .extend({
    groupBy: z.enum(["status", "type"]).optional(),
  });
