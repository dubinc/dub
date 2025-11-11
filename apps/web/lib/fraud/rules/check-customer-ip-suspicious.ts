import { z } from "zod";
import { FraudRuleContext, FraudRuleEvaluationResult } from "../types";

const contextSchema = z.object({
  customer: z
    .object({
      ip: z.string().nullable().default(null),
      country: z.string().nullable().default(null),
    })
    .nullable()
    .default(null),
  clickData: z
    .object({
      ip: z.string().nullable().default(null),
      country: z.string().nullable().default(null),
    })
    .nullable()
    .default(null),
});

const configSchema = z.object({
  checkProxy: z.boolean().default(true),
  checkVPN: z.boolean().default(true),
  checkTor: z.boolean().default(true),
  checkBlacklist: z.boolean().default(true),
  blacklistSources: z
    .array(z.enum(["internal", "abuseipdb", "virustotal"]))
    .default(["internal"]),
});

// Check if customer IP is associated with suspicious activity
export async function checkCustomerIPSuspicious({
  context,
  config,
}: {
  context: FraudRuleContext;
  config: unknown;
}): Promise<FraudRuleEvaluationResult> {
  // TODO:
  // Implement this rule

  const { customer, clickData } = contextSchema.parse(context);

  if (!customer || !clickData) {
    return {
      triggered: false,
    };
  }

  return {
    triggered: false,
  };
}
