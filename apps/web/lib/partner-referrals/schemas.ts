import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { COUNTRIES } from "@dub/utils";
import * as z from "zod/v4";
import { getPaginationQuerySchema } from "../zod/schemas/misc";
import { centsSchemaWithDefault } from "../zod/schemas/utils";

const PARTNER_REFERRAL_TRIGGER_CONFIG = {
  percentage: {
    commissionEarned: {
      verb: "earns a commission",
      basis: "referred partner's commission",
      previewBasis: "referred partner's commission earnings",
    },
    saleRecorded: {
      verb: "makes a sale",
      basis: "original sale amount",
      previewBasis: "original sale amount",
    },
  },
  flat: {
    partnerApproved: {
      verb: "is approved",
    },
    commissionThreshold: {
      verb: "earns at least",
    },
  },
} as const;

export type PartnerReferralPercentageTrigger =
  keyof typeof PARTNER_REFERRAL_TRIGGER_CONFIG.percentage;

type PartnerReferralFlatTrigger =
  keyof typeof PARTNER_REFERRAL_TRIGGER_CONFIG.flat;

type PartnerReferralTrigger =
  | PartnerReferralPercentageTrigger
  | PartnerReferralFlatTrigger;

export const PARTNER_REFERRAL_PERCENTAGE_TRIGGERS = Object.keys(
  PARTNER_REFERRAL_TRIGGER_CONFIG.percentage,
) as readonly PartnerReferralPercentageTrigger[];

export const PARTNER_REFERRAL_FLAT_TRIGGERS = Object.keys(
  PARTNER_REFERRAL_TRIGGER_CONFIG.flat,
) as readonly PartnerReferralFlatTrigger[];

export const PARTNER_REFERRAL_TRIGGER = [
  ...PARTNER_REFERRAL_PERCENTAGE_TRIGGERS,
  ...PARTNER_REFERRAL_FLAT_TRIGGERS,
] as readonly PartnerReferralTrigger[];

export const PARTNER_REFERRAL_TRIGGER_LABELS: Record<
  PartnerReferralTrigger,
  string
> = {
  ...Object.fromEntries(
    Object.entries(PARTNER_REFERRAL_TRIGGER_CONFIG.percentage).map(
      ([key, { verb }]) => [key, verb],
    ),
  ),
  ...Object.fromEntries(
    Object.entries(PARTNER_REFERRAL_TRIGGER_CONFIG.flat).map(
      ([key, { verb }]) => [key, verb],
    ),
  ),
} as Record<PartnerReferralTrigger, string>;

export const PARTNER_REFERRAL_PERCENTAGE_BASIS_LABELS = Object.fromEntries(
  Object.entries(PARTNER_REFERRAL_TRIGGER_CONFIG.percentage).map(
    ([key, { basis }]) => [key, basis],
  ),
) as {
  readonly [K in PartnerReferralPercentageTrigger]: string;
};

export const PARTNER_REFERRAL_PERCENTAGE_PREVIEW_BASIS_LABELS =
  Object.fromEntries(
    Object.entries(PARTNER_REFERRAL_TRIGGER_CONFIG.percentage).map(
      ([key, { previewBasis }]) => [key, previewBasis],
    ),
  ) as {
    readonly [K in PartnerReferralPercentageTrigger]: string;
  };

export const referralRewardConfigSchema = z
  .object({
    trigger: z.enum(PARTNER_REFERRAL_TRIGGER),
    commissionsThresholdInCents: z.number().int().min(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.trigger === "commissionThreshold" &&
      data.commissionsThresholdInCents == null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["commissionsThresholdInCents"],
        message: "Please enter a commission threshold amount.",
      });
    }
  });

// Stats from referred partners
export const partnerReferralStatsSchema = z.object({
  totalPartners: z.number(),
  totalConversions: z.number(),
  totalSaleAmount: z.number(),
});

// Response shape for a partner referred by the current partner
export const referredPartnerSchema = z.object({
  id: z.string(),
  email: z.string(),
  country: z.string().nullable(),
  programEnrollment: z.object({
    createdAt: z.date(),
    status: z.enum(ProgramEnrollmentStatus),
    earnings: centsSchemaWithDefault,
  }),
});

// Query params for the referred partners list endpoint
export const getReferredPartnersQuerySchema = z
  .object({
    country: z.enum(Object.keys(COUNTRIES)).optional(),
    status: z.enum(ProgramEnrollmentStatus).optional(),
  })
  .extend(getPaginationQuerySchema({ pageSize: 100 }));

// Query params for the referred partners count endpoint
export const getReferredPartnersCountQuerySchema =
  getReferredPartnersQuerySchema
    .omit({
      page: true,
      pageSize: true,
    })
    .extend({
      groupBy: z.enum(["country", "status"]).optional(),
    });
