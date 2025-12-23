import { FraudEventContext, PaidTrafficPlatform } from "@/lib/types";
import { getSearchParams } from "@dub/utils";
import { z } from "zod";
import {
  PAID_TRAFFIC_PLATFORMS,
  PAID_TRAFFIC_PLATFORMS_CONFIG,
} from "../constants";
import { defineFraudRule } from "../define-fraud-rule";

const configSchema = z.object({
  platforms: z.array(z.enum(PAID_TRAFFIC_PLATFORMS)).optional().default([]),
});

const defaultConfig: z.infer<typeof configSchema> = {
  platforms: ["google"],
};

export const checkPaidTrafficDetected = defineFraudRule({
  type: "paidTrafficDetected",
  evaluate: async ({ click }: FraudEventContext, rawConfig) => {
    const parsedConfig = configSchema.safeParse(rawConfig ?? defaultConfig);

    if (!parsedConfig.success) {
      console.error(
        `[checkPaidTrafficDetected] Invalid config:`,
        parsedConfig.error,
      );

      return {
        triggered: false,
      };
    }

    const config = parsedConfig.data;

    if (config.platforms.length === 0) {
      return {
        triggered: false,
      };
    }

    if (!click.url) {
      return {
        triggered: false,
      };
    }

    // Find the query params from the final URL
    const queryParams = getSearchParams(click.url);
    const queryParamsKeys = Object.keys(queryParams);

    let source: PaidTrafficPlatform | null = null;

    for (const platform of config.platforms) {
      const foundPlatform = PAID_TRAFFIC_PLATFORMS_CONFIG.find(
        (p) => p.id === platform,
      );

      if (!foundPlatform || !foundPlatform.queryParams) {
        continue;
      }

      for (const queryParamKey of queryParamsKeys) {
        if (foundPlatform.queryParams.includes(queryParamKey)) {
          source = foundPlatform.id;
          break;
        }
      }
    }

    if (source) {
      return {
        triggered: true,
        metadata: {
          source,
          url: click.url,
        },
      };
    }

    return {
      triggered: false,
    };
  },
});
