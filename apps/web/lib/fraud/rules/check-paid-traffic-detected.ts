import { getSearchParams } from "@dub/utils";
import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  click: z.object({
    url: z.string().nullable().default(null),
  }),
});

const configSchema = z.object({
  queryParams: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Ad-tracking query params to detect."),
});

export const checkPaidTrafficDetected = defineFraudRule({
  type: "paidTrafficDetected",
  contextSchema,
  configSchema,
  defaultConfig: {
    queryParams: [
      // Google
      "gclid",
      "gclsrc",
      "gbraid",
      "wbraid",
      // Facebook
      "fbclid",
      // Bing
      "msclkid",
      // TikTok
      "ttclid",
      // X/Twitter
      "twclid",
      "tclid",
      // LinkedIn
      "li_fat_id",
      "li_sponsored",
      // Pinterest
      "epik",
      // Reddit
      "rdt_cid",
      "rdt_pid",
      // Snapchat
      "sc_click_id",
      "sc_ua",
      // Amazon
      "amclid",
      "asc_refurl",
    ],
  },
  evaluate: async (context, config) => {
    console.log("Evaluating checkPaidTrafficDetected...", context, config);

    const { click } = context;

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
