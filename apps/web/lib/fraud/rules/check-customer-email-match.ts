import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";
import { normalizeEmail } from "../utils/similarity";

const contextSchema = z.object({
  partner: z.object({
    id: z.string(),
    email: z.string().nullable().default(null),
  }),
  customer: z.object({
    id: z.string(),
    email: z.string().nullable().default(null),
  }),
});

export const checkCustomerEmailMatch = defineFraudRule({
  type: "customerEmailMatch",
  contextSchema,
  evaluate: async (context) => {
    console.log("Evaluating checkCustomerEmailMatch...", context);

    const { partner, customer } = context;

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
