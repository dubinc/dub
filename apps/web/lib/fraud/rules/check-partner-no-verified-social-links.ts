import { defineFraudRule } from "../define-fraud-rule";
import { FraudPartnerContext } from "../types";

export const checkPartnerNoVerifiedSocialLinks = defineFraudRule({
  type: "partnerNoVerifiedSocialLinks",
  evaluate: async ({ partner }: FraudPartnerContext) => {
    console.log("Evaluating checkPartnerNoVerifiedSocialLinks...");

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
