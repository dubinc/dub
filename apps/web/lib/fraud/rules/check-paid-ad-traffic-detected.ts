import { getSearchParams } from "@dub/utils";
import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  click: z.object({
    url: z.string().nullable().default(null),
    referer: z.string().nullable().default(null),
  }),
});

const configSchema = z.object({
  queryParams: z.array(z.string()).describe("Ad-tracking query params."),
  referrers: z.array(z.string()).describe("Referer domains."),
});

export const checkPaidAdTrafficDetected = defineFraudRule({
  type: "paid_ad_traffic_detected",
  contextSchema,
  configSchema,
  defaultConfig: {
    queryParams: ["gclid", "gad_source", "gad_campaignid"],
    referrers: ["google.com"],
  },
  evaluate: async (context, config) => {
    const { click } = context;

    if (!click.url || !click.referer) {
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

    // Check if the referer is in the config
    const foundReferrer = config.referrers.find(
      (referrer) => referrer.toLowerCase() === click.referer?.toLowerCase(),
    );

    if (filteredQueryParams.length > 0 && foundReferrer) {
      return {
        triggered: true,
        reasonCode: "paid_ad_traffic_detected",
        metadata: {
          referrers: foundReferrer,
          queryParams: filteredQueryParams,
        },
      };
    }

    return {
      triggered: false,
    };
  },
});
