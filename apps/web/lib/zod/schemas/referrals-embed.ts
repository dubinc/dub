import * as z from "zod/v4";
import { LinkSchema } from "./links";

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
});
