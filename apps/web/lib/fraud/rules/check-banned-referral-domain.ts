import { redis } from "@/lib/upstash/redis";
import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  customer: z.object({
    email: z.string().nullable().default(null),
  }),
});

const configSchema = z.object({
  //
});

export const checkBannedReferralDomain = defineFraudRule({
  type: "banned_referral_domain",
  contextSchema,
  configSchema,
  evaluate: async (context) => {
    const { customer } = context;

    // If no customer email provided, rule doesn't trigger
    if (!customer.email) {
      return {
        triggered: false,
        metadata: {
          reason: "no_customer_email",
        },
      };
    }

    // Extract domain from email
    const emailParts = customer.email.split("@");
    if (emailParts.length !== 2) {
      return {
        triggered: false,
        metadata: {
          reason: "invalid_email_format",
          customerEmail: customer.email,
        },
      };
    }

    const domain = emailParts[1].toLowerCase().trim();

    // Check if domain exists in Redis set
    try {
      const isDisposable = await redis.sismember(
        "disposableEmailDomains",
        domain,
      );

      if (isDisposable === 1) {
        return {
          triggered: true,
          reasonCode: "customer_email_disposable_domain",
          metadata: {
            customerEmail: customer.email,
            domain,
          },
        };
      }

      return {
        triggered: false,
        metadata: {
          customerEmail: customer.email,
          domain,
          isDisposable: false,
        },
      };
    } catch (error) {
      // If Redis check fails, log error but don't trigger fraud
      console.error(
        "Error checking disposable email domain:",
        error instanceof Error ? error.message : String(error),
      );

      return {
        triggered: false,
        metadata: {
          reason: "redis_check_failed",
          customerEmail: customer.email,
          domain,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },
});
