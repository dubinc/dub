import { redisWithTimeout } from "@/lib/upstash/redis";
import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  partner: z.object({
    email: z.string().nullable().default(null),
  }),
});

export const checkPartnerEmailSuspicious = defineFraudRule({
  type: "partnerEmailSuspiciousDomain",
  contextSchema,
  evaluate: async (context) => {
    console.log("Evaluating checkPartnerEmailSuspicious...");

    const { partner } = context;

    // If no partner email provided, rule doesn't trigger
    if (!partner.email) {
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

    const domain = emailParts[1].toLowerCase().trim();

    try {
      const isDisposable = await redisWithTimeout.sismember(
        "disposableEmailDomains",
        domain,
      );

      return {
        triggered: isDisposable === 1,
      };
    } catch (error) {
      // If Redis check fails, log error but don't trigger fraud
      console.error(
        "Error checking disposable email domain:",
        error instanceof Error ? error.message : String(error),
      );

      return {
        triggered: false,
      };
    }
  },
});
