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

    // Check Levenshtein similarity
    const emailSimilarity = calculateSimilarity(
      normalizedPartnerEmail,
      normalizedCustomerEmail,
    );

    if (emailSimilarity >= SIMILARITY_THRESHOLD) {
      return {
        triggered: true,
        metadata,
      };
    }

    // Check domain variation (similar domains + matching usernames)
    const partnerParts = extractEmailParts(normalizedPartnerEmail);
    const customerParts = extractEmailParts(normalizedCustomerEmail);

    if (!partnerParts || !customerParts) {
      return {
        triggered: false,
      };
    }

    const domainSimilarity = checkDomainSimilarity(
      partnerParts.domain,
      customerParts.domain,
    );

    if (!domainSimilarity.isSimilar) {
      return {
        triggered: false,
      };
    }

    // Check if usernames match exactly or are similar
    const usernameMatch =
      partnerParts.username === customerParts.username ||
      calculateSimilarity(partnerParts.username, customerParts.username) >=
        SIMILARITY_THRESHOLD;

    if (usernameMatch) {
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
