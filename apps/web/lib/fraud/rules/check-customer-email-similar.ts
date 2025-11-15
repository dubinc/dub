import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";
import {
  calculateSimilarity,
  checkDomainSimilarity,
  extractEmailParts,
  normalizeEmail,
} from "../utils/similarity";

const SIMILARITY_THRESHOLD = 0.8;

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

export const checkCustomerEmailSimilar = defineFraudRule({
  type: "customerEmailSimilar",
  contextSchema,
  evaluate: async (context) => {
    console.log("Evaluating checkCustomerEmailSimilar...", context);

    const { partner, customer } = context;

    const metadata = {
      partnerId: partner.id,
      customerId: customer.id,
    };

    // Return false if either email is missing
    if (!partner.email || !customer.email) {
      console.log("[checkCustomerEmailSimilar] No customer or partner email.");

      return {
        triggered: false,
      };
    }

    // Normalize both emails
    const normalizedPartnerEmail = normalizeEmail(partner.email);
    const normalizedCustomerEmail = normalizeEmail(customer.email);

    // Check Levenshtein similarity
    const emailSimilarity = calculateSimilarity(
      normalizedPartnerEmail,
      normalizedCustomerEmail,
    );

    if (emailSimilarity >= SIMILARITY_THRESHOLD) {
      console.log("[checkCustomerEmailSimilar] Email similarity found.");

      return {
        triggered: true,
        metadata,
      };
    }

    // Check domain variation (similar domains + matching usernames)
    const partnerParts = extractEmailParts(normalizedPartnerEmail);
    const customerParts = extractEmailParts(normalizedCustomerEmail);

    if (!partnerParts || !customerParts) {
      console.log("[checkCustomerEmailSimilar] No partner or customer parts.");

      return {
        triggered: false,
      };
    }

    const domainSimilarity = checkDomainSimilarity(
      partnerParts.domain,
      customerParts.domain,
    );

    if (domainSimilarity.isSimilar) {
      console.log("[checkCustomerEmailSimilar] Domain similarity found.");

      return {
        triggered: true,
        metadata,
      };
    }

    // Check if usernames match exactly or are similar
    const usernameMatch =
      partnerParts.username === customerParts.username ||
      calculateSimilarity(partnerParts.username, customerParts.username) >=
        SIMILARITY_THRESHOLD;

    if (usernameMatch) {
      console.log("[checkCustomerEmailSimilar] Username match found.");

      return {
        triggered: true,
        metadata,
      };
    }

    console.log("[checkCustomerEmailSimilar] No match found.");

    return {
      triggered: false,
    };
  },
});
