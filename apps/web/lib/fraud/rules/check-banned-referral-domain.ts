import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  customer: z.object({
    email: z.string().nullable().default(null),
  }),
});

const configSchema = z.object({
  domains: z.array(z.string()).describe("List of banned referral domains."),
});

export const checkBannedReferralDomain = defineFraudRule({
  type: "bannedReferralDomain",
  name: "Banned Referral Domain",
  riskLevel: "high",
  contextSchema,
  configSchema,
  defaultConfig: {
    domains: [],
  },
  evaluate: async (context, config) => {
    const { customer } = context;

    if (config.domains.length === 0) {
      return {
        triggered: false,
      };
    }

    // Check if customer email is provided
    if (!customer.email) {
      return {
        triggered: false,
      };
    }

    // Extract domain from email
    const emailParts = customer.email.split("@");

    if (!emailParts || emailParts.length !== 2) {
      return {
        triggered: false,
      };
    }

    // Check if domain is banned
    const emailDomain = emailParts[1].toLowerCase().trim();

    if (config.domains.includes(emailDomain)) {
      return {
        triggered: true,
        reason: "bannedReferralDomain",
      };
    }

    return {
      triggered: false,
    };
  },
});
