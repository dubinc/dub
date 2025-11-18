import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  partner: z.object({
    website: z.string().nullable().default(null),
    youtube: z.string().nullable().default(null),
    twitter: z.string().nullable().default(null),
    linkedin: z.string().nullable().default(null),
    instagram: z.string().nullable().default(null),
    tiktok: z.string().nullable().default(null),
  }),
});

export const checkPartnerNoSocialLinks = defineFraudRule({
  type: "partnerNoSocialLinks",
  contextSchema,
  evaluate: async (context) => {
    console.log("Evaluating checkPartnerNoSocialLinks...", context);

    const { partner } = context;

    // Check if website is provided
    const hasWebsite = partner.website && partner.website.trim().length > 0;

    // Check if any social links are provided
    const hasSocialLinks =
      (partner.youtube && partner.youtube.trim().length > 0) ||
      (partner.twitter && partner.twitter.trim().length > 0) ||
      (partner.linkedin && partner.linkedin.trim().length > 0) ||
      (partner.instagram && partner.instagram.trim().length > 0) ||
      (partner.tiktok && partner.tiktok.trim().length > 0);

    // Trigger if no website AND no social links
    const triggered = !hasWebsite && !hasSocialLinks;

    return {
      triggered,
    };
  },
});

