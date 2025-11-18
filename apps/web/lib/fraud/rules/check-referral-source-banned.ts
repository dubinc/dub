import { minimatch } from "minimatch";
import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";
import { FraudEventContext } from "../types";

const configSchema = z.object({
  bannedSources: z
    .array(z.string())
    .optional()
    .default([])
    .describe(
      "Banned referral sources (supports glob patterns like *.spam-domain.com)",
    ),
});

export const checkReferralSourceBanned = defineFraudRule({
  type: "referralSourceBanned",
  evaluate: async ({ click }: FraudEventContext, { bannedSources }) => {
    console.log("Evaluating checkReferralSourceBanned...");

    // Return early if both referer and referer_url are null/empty
    if (!click.referer && !click.referer_url) {
      return {
        triggered: false,
      };
    }

    if (bannedSources.length === 0) {
      return {
        triggered: false,
      };
    }

    // Check both referer and referer_url against banned sources
    const sourcesToCheck = [click.referer, click.referer_url].filter(
      (source): source is string => !!source,
    );

    for (const source of sourcesToCheck) {
      for (const pattern of bannedSources) {
        if (minimatch(source, pattern, { nocase: true })) {
          return {
            triggered: true,
            metadata: {
              matchedSource: source,
              matchedPattern: pattern,
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
