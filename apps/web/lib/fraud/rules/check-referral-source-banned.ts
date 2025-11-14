import { minimatch } from "minimatch";
import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  click: z.object({
    referer: z.string().nullable().default(null),
    referer_url: z.string().nullable().default(null),
  }),
});

const configSchema = z.object({
  bannedSources: z
    .array(z.string())
    .describe("Banned referral sources (supports glob patterns like *.spam-domain.com)"),
});

export const checkReferralSourceBanned = defineFraudRule({
  type: "referralSourceBanned",
  contextSchema,
  configSchema,
  evaluate: async (context, config) => {
    console.log("Evaluating checkReferralSourceBanned...", context, config);

    const { click } = context;
    const { bannedSources } = config;

    // Return early if both referer and referer_url are null/empty
    if (!click.referer && !click.referer_url) {
      return {
        triggered: false,
      };
    }

    if(bannedSources.length === 0) {
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
