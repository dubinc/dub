import { defineFraudRule } from "../define-fraud-rule";
import { FraudPartnerContext } from "../types";

export const checkPartnerEmailDomainMismatch = defineFraudRule({
  type: "partnerEmailDomainMismatch",
  evaluate: async ({ partner }: FraudPartnerContext) => {
    console.log("Evaluating checkPartnerEmailDomainMismatch...");

    if (!partner.email || !partner.website) {
      return {
        triggered: false,
      };
    }

    // Extract domain from email
    const emailParts = partner.email.split("@");
    if (emailParts.length !== 2) {
      return {
        triggered: false,
      };
    }

    const emailDomain = emailParts[1].toLowerCase().trim();

    // Extract domain from website
    let websiteDomain: string;

    try {
      const websiteUrl = new URL(partner.website);
      websiteDomain = websiteUrl.hostname.toLowerCase().trim();
    } catch (error) {
      return {
        triggered: false,
      };
    }

    // Compare domains (case-insensitive)
    const domainsMatch = emailDomain === websiteDomain;

    return {
      triggered: !domainsMatch,
    };
  },
});
