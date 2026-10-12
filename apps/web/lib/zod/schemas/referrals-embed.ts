import * as z from "zod/v4";
import { DiscountSchema } from "./discount";
import { LinkSchema } from "./links";
import { RewardSchema } from "./rewards";

export const ReferralsEmbedLinkSchema = LinkSchema.pick({
  id: true,
  domain: true,
  key: true,
  url: true,
  shortLink: true,
  clicks: true,
  leads: true,
  conversions: true,
}).extend({
  partnerGroupDefaultLinkId: z.string().nullish(),
  clickReward: RewardSchema.nullable().default(null),
  leadReward: RewardSchema.nullable().default(null),
  saleReward: RewardSchema.nullable().default(null),
  discount: DiscountSchema.nullable().default(null),
});
