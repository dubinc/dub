import * as z from "zod/v4";
import {
  partnerReferralStatsSchema,
  referralRewardConfigSchema,
} from "./schemas";

export type ReferralRewardConfig = z.infer<typeof referralRewardConfigSchema>;

export type PartnerReferralStats = z.infer<typeof partnerReferralStatsSchema>;
