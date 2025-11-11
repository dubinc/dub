import { redis } from "@/lib/upstash/redis";
import { z } from "zod";
import { FraudRuleContext, FraudRuleEvaluationResult } from "../types";

const contextSchema = z.object({
  customerEmail: z.string().nullable().default(null),
});

const configSchema = z.object({
  //
});

// Check if customer email domain is in the disposable email domains list
export async function checkCustomerEmailSuspicious(
  context: FraudRuleContext,
  config: unknown,
): Promise<FraudRuleEvaluationResult> {
  const { customerEmail } = contextSchema.parse(context);

  // If no customer email provided, rule doesn't trigger
  if (!customerEmail) {
    return {
      triggered: false,
      metadata: {
        reason: "no_customer_email",
      },
    };
  }

  // Extract domain from email
  const emailParts = customerEmail.split("@");
  if (emailParts.length !== 2) {
    return {
      triggered: false,
      metadata: {
        reason: "invalid_email_format",
        customerEmail,
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
          customerEmail,
          domain,
        },
      };
    }

    return {
      triggered: false,
      metadata: {
        customerEmail,
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
        customerEmail,
        domain,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
