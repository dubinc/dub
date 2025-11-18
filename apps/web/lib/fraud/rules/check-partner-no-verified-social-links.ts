import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  partner: z.object({
    websiteVerifiedAt: z.date().nullable().default(null),
    youtubeVerifiedAt: z.date().nullable().default(null),
    twitterVerifiedAt: z.date().nullable().default(null),
    linkedinVerifiedAt: z.date().nullable().default(null),
    instagramVerifiedAt: z.date().nullable().default(null),
    tiktokVerifiedAt: z.date().nullable().default(null),
  }),
});

export const checkPartnerNoVerifiedSocialLinks = defineFraudRule({
  type: "partnerNoVerifiedSocialLinks",
  contextSchema,
  evaluate: async (context) => {
    console.log("Evaluating checkPartnerNoVerifiedSocialLinks...", context);

    const { partner } = context;

    // Check if website is verified
    const hasVerifiedWebsite = partner.websiteVerifiedAt !== null;

    // Check if any social links are verified
    const hasVerifiedSocialLinks =
      partner.youtubeVerifiedAt !== null ||
      partner.twitterVerifiedAt !== null ||
      partner.linkedinVerifiedAt !== null ||
      partner.instagramVerifiedAt !== null ||
      partner.tiktokVerifiedAt !== null;

    // Trigger if no verified website AND no verified social links
    const triggered = !hasVerifiedWebsite && !hasVerifiedSocialLinks;

    return {
      triggered,
    };
  },
});

