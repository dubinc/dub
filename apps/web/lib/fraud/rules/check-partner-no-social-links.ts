import { defineFraudRule } from "../define-fraud-rule";
import { FraudPartnerContext } from "../types";

export const checkPartnerNoSocialLinks = defineFraudRule({
  type: "partnerNoSocialLinks",
  evaluate: async ({ partner }: FraudPartnerContext) => {
    console.log("Evaluating checkPartnerNoSocialLinks...");

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
