import { FraudEventContext } from "@/lib/types";
import { redisWithTimeout } from "@/lib/upstash/redis";
import { defineFraudRule } from "../define-fraud-rule";

export const checkCustomerEmailSuspicious = defineFraudRule({
  type: "customerEmailSuspiciousDomain",
  evaluate: async ({ customer }: FraudEventContext) => {
    // If no customer email provided, rule doesn't trigger
    if (!customer.email) {
      return {
        triggered: false,
      };
    }

    // Extract domain from email
    const emailParts = customer.email.split("@");
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
