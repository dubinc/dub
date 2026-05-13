import * as z from "zod/v4";
import { referralRewardConfigSchema } from "../zod/schemas/rewards";
import {
  networkReferralSchema,
  networkReferralsStatsSchema,
  partnerReferralStatsSchema,
  referredPartnerSchema,
} from "./schemas";

export type ReferralRewardConfig = z.infer<typeof referralRewardConfigSchema>;

export type PartnerReferralStats = z.infer<typeof partnerReferralStatsSchema>;

export type ReferredPartnerProps = z.infer<typeof referredPartnerSchema>;

export type NetworkReferralProps = z.infer<typeof networkReferralSchema>;

export type NetworkReferralsStats = z.infer<typeof networkReferralsStatsSchema>;
