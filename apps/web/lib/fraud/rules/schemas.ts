import { z } from "zod";

export const customerIPSuspiciousConfigSchema = z.object({
  checkProxy: z.boolean().default(true),
  checkVPN: z.boolean().default(true),
  checkTor: z.boolean().default(true),
  checkBlacklist: z.boolean().default(true),
  blacklistSources: z
    .array(z.enum(["internal", "abuseipdb", "virustotal"]))
    .default(["internal"]),
});

export const partnerEmailMatchesCustomerEmailConfigSchema = z.object({
  similarityThreshold: z.number().min(0).max(1).default(0.8),
  checkLevenshtein: z.boolean().default(true),
  checkDomainVariations: z.boolean().default(true),
  checkExactMatch: z.boolean().default(true),
});

// export const fraudRuleConfigSchemas: Record<
//   FraudRuleType,
//   z.ZodSchema | undefined
// > = {
//   customer_ip_suspicious: customerIPSuspiciousConfigSchema,
//   partner_email_matches_customer_email:
//     partnerEmailMatchesCustomerEmailConfigSchema,
//   abnormally_fast_conversion: undefined,
//   customer_email_suspicious_domain: undefined,
//   customer_ip_country_mismatch: undefined,
//   banned_referral_domain: undefined,
//   suspicious_activity_spike: undefined,
//   paid_ad_traffic_detected: undefined,
// } as const;
