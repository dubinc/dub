import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

// Check if customer IP is associated with suspicious activity
export const checkCustomerIPSuspicious = defineFraudRule({
  type: "customer_ip_suspicious",

  contextSchema: z.object({
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
  }),

  configSchema: z.object({
    checkProxy: z.boolean().default(true),
    checkVPN: z.boolean().default(true),
    checkTor: z.boolean().default(true),
    checkBlacklist: z.boolean().default(true),
    blacklistSources: z
      .array(z.enum(["internal", "abuseipdb", "virustotal"]))
      .default(["internal"]),
  }),

  evaluate: async (context) => {
    // TODO:
    // Implement this rule

    const { customer, clickData } = context;

    if (!customer || !clickData) {
      return {
        triggered: false,
      };
    }

    return {
      triggered: false,
    };
  },
});
