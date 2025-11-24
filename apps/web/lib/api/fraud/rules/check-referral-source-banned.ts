import { FraudEventContext } from "@/lib/types";
import { getDomainWithoutWWW } from "@dub/utils";
import { minimatch } from "minimatch";
import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const configSchema = z.object({
  domains: z.array(z.string()).optional().default([]),
});

const defaultConfig: z.infer<typeof configSchema> = {
  domains: [],
};

export const checkReferralSourceBanned = defineFraudRule({
  type: "referralSourceBanned",
  evaluate: async ({ click }: FraudEventContext, rawConfig) => {
    const parsedConfig = configSchema.safeParse(rawConfig ?? defaultConfig);

    if (!parsedConfig.success) {
      console.error(
        `[checkReferralSourceBanned] Invalid config:`,
        parsedConfig.error,
      );

      return {
        triggered: false,
      };
    }

    const config = parsedConfig.data;

    // Normalize banned domains by extracting domains and removing www. prefix
    const normalizedBannedDomains = config.domains
      .map((domain) => getDomainWithoutWWW(domain))
      .filter((domain): domain is string => Boolean(domain));

    if (normalizedBannedDomains.length === 0 || !click) {
      return {
        triggered: false,
      };
    }

    // Return early if both referer and referer_url are null/empty
    if (!click.referer && !click.referer_url) {
      return {
        triggered: false,
      };
    }

    // Check both referer and referer_url against banned sources
    // Normalize referrers by extracting domains and removing www. prefix
    const referrerCandidates = [click.referer, click.referer_url]
      .filter((value): value is string => Boolean(value))
      .map((referrer) => getDomainWithoutWWW(referrer))
      .filter((domain): domain is string => Boolean(domain));

    for (const referrer of referrerCandidates) {
      for (const source of normalizedBannedDomains) {
        if (minimatch(referrer, source, { nocase: true })) {
          return {
            triggered: true,
            metadata: {
              source,
            },
          };
        }
      }
    }

    return {
      triggered: false,
    };
  },
});
