import * as z from "zod/v4";

const PARTNER_REFERRAL_TRIGGER_CONFIG = {
  percentage: {
    commissionEarned: {
      verb: "earns a commission",
      basis: "referred partner's commission",
    },
    saleRecorded: {
      verb: "makes a sale",
      basis: "original sale amount",
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

type PartnerReferralPercentageTrigger =
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

export type ReferralRewardConfig = z.infer<typeof referralRewardConfigSchema>;
