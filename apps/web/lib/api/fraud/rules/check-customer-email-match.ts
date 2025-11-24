import { FraudEventContext } from "@/lib/types";
import { defineFraudRule } from "../define-fraud-rule";
import { normalizeEmail } from "../utils";

// Partner's email matches a customer's email and could be a self referral.
export const checkCustomerEmailMatch = defineFraudRule({
  type: "customerEmailMatch",
  evaluate: async ({ partner, customer }: FraudEventContext) => {
    // Return false if either email is missing
    if (!partner.email || !customer.email) {
      return {
        triggered: false,
      };
    }

    // Normalize both emails
    const normalizedPartnerEmail = normalizeEmail(partner.email);
    const normalizedCustomerEmail = normalizeEmail(customer.email);

    // Check for exact match
    if (normalizedPartnerEmail === normalizedCustomerEmail) {
      return {
        triggered: true,
      };
    }

    return {
      triggered: false,
    };
  },
});
