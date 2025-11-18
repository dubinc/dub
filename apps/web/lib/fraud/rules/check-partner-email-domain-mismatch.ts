import { prisma } from "@dub/prisma";
import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  partner: z.object({
    id: z.string(),
    email: z.string().nullable().default(null),
  }),
});

export const checkPartnerEmailDomainMismatch = defineFraudRule({
  type: "partnerEmailDomainMismatch",
  contextSchema,
  evaluate: async (context) => {
    console.log("Evaluating checkPartnerEmailDomainMismatch...");

    const { partner } = context;

    // Return false if email is missing
    if (!partner.email) {
      return {
        triggered: false,
      };
    }

    // Fetch partner's website from database
    const partnerRecord = await prisma.partner.findUnique({
      where: {
        id: partner.id,
      },
      select: {
        website: true,
      },
    });

    // Return false if website is missing
    if (!partnerRecord?.website) {
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
      const websiteUrl = new URL(partnerRecord.website);
      websiteDomain = websiteUrl.hostname.toLowerCase().trim();
    } catch (error) {
      // If URL parsing fails, return false
      console.error(
        "Error parsing website URL:",
        error instanceof Error ? error.message : String(error),
      );
      return {
        triggered: false,
      };
    }

    // Compare domains (case-insensitive)
    const domainsMatch = emailDomain === websiteDomain;

    const metadata = {
      partnerId: partner.id,
      emailDomain,
      websiteDomain,
    };

    return {
      triggered: !domainsMatch,
      metadata,
    };
  },
});
