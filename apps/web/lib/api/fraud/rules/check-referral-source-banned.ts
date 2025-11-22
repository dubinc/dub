import { FraudEventContext } from "@/lib/types";
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
    console.log("Evaluating checkReferralSourceBanned...", rawConfig);

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

    if (config.domains.length === 0) {
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
    const referrerCandidates = [click.referer, click.referer_url].filter(
      (value): value is string => Boolean(value),
    );

    for (const referrer of referrerCandidates) {
      for (const source of config.domains) {
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
