import * as z from "zod/v4";
import { referralRewardConfigSchema } from "../zod/schemas/rewards";
import {
  networkReferralSchema,
  networkReferralsStatsSchema,
  networkReferralsTimeseriesSchema,
  partnerReferralSchema,
  referredPartnerSchema,
} from "./schemas";

export type ReferralRewardConfig = z.infer<typeof referralRewardConfigSchema>;

export type PartnerReferral = z.infer<typeof partnerReferralSchema>;

export type ReferredPartnerProps = z.infer<typeof referredPartnerSchema>;

export type NetworkReferralProps = z.infer<typeof networkReferralSchema>;

export type NetworkReferralsStats = z.infer<typeof networkReferralsStatsSchema>;

export type NetworkReferralsTimeseries = z.infer<
  typeof networkReferralsTimeseriesSchema
>;
