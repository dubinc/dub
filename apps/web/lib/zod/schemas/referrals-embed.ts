import * as z from "zod/v4";
import { LinkSchema, linkUrlSchema } from "./links";

export const ReferralsEmbedLinkSchema = LinkSchema.pick({
  id: true,
  domain: true,
  key: true,
  shortLink: true,
  clicks: true,
  leads: true,
  sales: true,
  saleAmount: true,
}).extend({
  url: linkUrlSchema,
  partnerGroupDefaultLinkId: z.string().nullish(),
});
