import { isGenericEmail } from "@/lib/is-generic-email";
import { FraudEventContext } from "@/lib/types";
import { CustomerEmailMatchType } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { defineFraudRule } from "../define-fraud-rule";
import { extractEmailDomain, normalizeEmail } from "../utils";

// Partner's email matches a customer's email, shares the same email domain,
// or the customer's domain matches a previously referred customer.
export const checkCustomerEmailMatch = defineFraudRule({
  type: "customerEmailMatch",
  evaluate: async ({ program, partner, customer }: FraudEventContext) => {
    // Return false if either email is missing
    if (!partner.email || !customer.email) {
      return {
        triggered: false,
      };
    }

    // Normalize both emails
    const normalizedPartnerEmail = normalizeEmail(partner.email);
    const normalizedCustomerEmail = normalizeEmail(customer.email);

    // 1. Exact email match (strongest signal)
    if (normalizedPartnerEmail === normalizedCustomerEmail) {
      return {
        triggered: true,
        metadata: {
          matchType: CustomerEmailMatchType.EXACT,
        },
      };
    }

    // Extract domains for domain-level checks
    const partnerEmailDomain = extractEmailDomain(partner.email);
    const customerEmailDomain = extractEmailDomain(customer.email);

    if (!partnerEmailDomain || !customerEmailDomain) {
      return {
        triggered: false,
      };
    }

    // Skip domain matching for free email providers
    if (isGenericEmail(customer.email)) {
      return {
        triggered: false,
      };
    }

    // 2. Partner-customer domain match
    if (partnerEmailDomain === customerEmailDomain) {
      return {
        triggered: true,
        metadata: {
          matchType: CustomerEmailMatchType.DOMAIN_MATCH,
        },
      };
    }

    // 3. Historical domain match — customer's email domain matches
    // a previously referred customer from the same partner
    if (customer.sales === 1) {
      const previousCustomer = await prisma.customer.findFirst({
        where: {
          programId: program.id,
          partnerId: partner.id,
          id: {
            not: customer.id,
          },
          email: {
            endsWith: `@${customerEmailDomain}`,
          },
        },
        select: {
          id: true,
        },
      });

      if (previousCustomer) {
        return {
          triggered: true,
          metadata: {
            matchType: CustomerEmailMatchType.HISTORICAL_DOMAIN_MATCH,
          },
        };
      }
    }

    return {
      triggered: false,
    };
  },
});
