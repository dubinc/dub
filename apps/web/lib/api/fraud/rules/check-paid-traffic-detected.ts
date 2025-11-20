import { FraudEventContext } from "@/lib/types";
import { getSearchParams } from "@dub/utils";
import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const configSchema = z.object({
  queryParams: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Ad-tracking query params to detect."),
});

export const checkPaidTrafficDetected = defineFraudRule({
  type: "paidTrafficDetected",
  defaultConfig: {
    queryParams: [
      // Google
      "gclid",
      "gclsrc",
      "gbraid",
      "wbraid",
    ],
  },
  evaluate: async ({ click }: FraudEventContext, config) => {
    console.log("Evaluating checkPaidTrafficDetected...");

    if (!click.url) {
      return {
        triggered: false,
      };
    }

    if (config.queryParams.length === 0) {
      return {
        triggered: false,
      };
    }

    const queryParams = getSearchParams(click.url);
    const queryParamsKeys = Object.keys(queryParams);

    // Check if any of the query params are in the config
    const filteredQueryParams = queryParamsKeys.filter((param) =>
      config.queryParams.includes(param),
    );

    if (filteredQueryParams.length > 0) {
      return {
        triggered: true,
        metadata: {
          queryParams: filteredQueryParams,
        },
      };
    }

    return {
      triggered: false,
    };
  },
});
