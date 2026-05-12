import * as z from "zod/v4";
import {
  networkReferralSchema,
  partnerReferralStatsSchema,
  referralRewardConfigSchema,
  referredPartnerSchema,
} from "./schemas";

export type ReferralRewardConfig = z.infer<typeof referralRewardConfigSchema>;

export type PartnerReferralStats = z.infer<typeof partnerReferralStatsSchema>;

export type ReferredPartnerProps = z.infer<typeof referredPartnerSchema>;

export type NetworkReferralProps = z.infer<typeof networkReferralSchema>;
