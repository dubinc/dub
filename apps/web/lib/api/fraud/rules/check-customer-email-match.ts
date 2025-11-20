import { FraudEventContext } from "@/lib/types";
import { defineFraudRule } from "../define-fraud-rule";
import { normalizeEmail } from "../utils";

export const checkCustomerEmailMatch = defineFraudRule({
  type: "customerEmailMatch",
  evaluate: async ({ partner, customer }: FraudEventContext) => {
    console.log("Evaluating checkCustomerEmailMatch...");

    const metadata = {
      partnerId: partner.id,
      customerId: customer.id,
    };

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
        metadata,
      };
    }

    return {
      triggered: false,
    };
  },
});
