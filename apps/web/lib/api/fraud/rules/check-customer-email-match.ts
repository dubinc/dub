import { extractEmailDomain } from "@/lib/email/extract-email-domain";
import { isGenericEmail } from "@/lib/email/is-generic-email";
import { normalizeEmail } from "@/lib/email/normalize-email";
import { prisma } from "@/lib/prisma";
import { FraudEventContext } from "@/lib/types";
import { CustomerEmailMatchType } from "@/lib/zod/schemas/fraud";
import { defineFraudRule } from "../define-fraud-rule";

// Partner's email matches a customer's email, shares the same email domain,
// or the customer's domain matches a previously referred customer.
export const checkCustomerEmailMatch = defineFraudRule({
  type: "customerEmailMatch",
  evaluate: async ({ program, partner, customer }: FraudEventContext) => {
    // Return false if the customer email is missing
    if (!customer.email) {
      return {
        triggered: false,
      };
    }

    // Normalize both emails
    const normalizedPartnerEmail = partner.email
      ? normalizeEmail(partner.email)
      : null;
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

    const shouldCheckHistoricalMatch =
      ("isFirstConversion" in customer && customer.isFirstConversion) ||
      !("isFirstConversion" in customer);

    // 2. Similar email match — customer's normalized email matches
    // a previously referred customer from the same partner.
    // Require the raw emails to differ so duplicate rows for the same
    // address (e.g. created by importers or promo-code attribution)
    // don't trigger; only actual variants do.
    if (shouldCheckHistoricalMatch) {
      const similarCustomer = await prisma.customer.findFirst({
        where: {
          projectId: program.workspaceId,
          normalizedEmail: normalizedCustomerEmail,
          partnerId: partner.id,
          id: {
            not: customer.id,
          },
          email: {
            not: customer.email,
          },
        },
        select: {
          id: true,
        },
      });

      if (similarCustomer) {
        return {
          triggered: true,
          metadata: {
            matchType: CustomerEmailMatchType.SIMILAR_EMAIL_MATCH,
            matchedCustomerId: similarCustomer.id,
          },
        };
      }
    }

    // Return false if the partner email is missing
    if (!partner.email) {
      return {
        triggered: false,
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

    // 3. Partner-customer domain match
    if (partnerEmailDomain === customerEmailDomain) {
      return {
        triggered: true,
        metadata: {
          matchType: CustomerEmailMatchType.DOMAIN_MATCH,
        },
      };
    }

    // 4. Historical domain match — customer's email domain matches
    // a previously referred customer from the same partner
    if (shouldCheckHistoricalMatch) {
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
