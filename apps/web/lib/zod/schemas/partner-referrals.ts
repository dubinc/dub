import * as z from "zod/v4";

export const PARTNER_REFERRAL_PERCENTAGE_TRIGGERS = [
  "commissionEarned",
  "saleRecorded",
] as const;

export const PARTNER_REFERRAL_FLAT_TRIGGERS = [
  "partnerApproved",
  "commissionThreshold",
] as const;

export const PARTNER_REFERRAL_TRIGGER = [
  ...PARTNER_REFERRAL_PERCENTAGE_TRIGGERS,
  ...PARTNER_REFERRAL_FLAT_TRIGGERS,
] as const;

export const PARTNER_REFERRAL_TRIGGER_LABELS: Record<
  (typeof PARTNER_REFERRAL_TRIGGER)[number],
  string
> = {
  commissionEarned: "earns a commission",
  saleRecorded: "makes a sale",
  partnerApproved: "is approved",
  commissionThreshold: "earns at least",
} as const;

export const referralRewardConfigSchema = z
  .object({
    trigger: z.enum(PARTNER_REFERRAL_TRIGGER),
    thresholdInCents: z.number().int().min(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.trigger === "commissionThreshold" &&
      data.thresholdInCents == null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["thresholdInCents"],
        message:
          "thresholdInCents is required when trigger is 'commissionThreshold'.",
      });
    }
  });

export type ReferralRewardConfig = z.infer<typeof referralRewardConfigSchema>;
