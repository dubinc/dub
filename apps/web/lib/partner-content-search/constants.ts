export const PARTNER_CONTENT_SEARCH_FEATURE_FLAG =
  "PARTNER_CONTENT_SEARCH_ENABLED";

export const PARTNER_CONTENT_SEARCH_ENV_VARS = {
  scrapeCreatorsApiKey: "SCRAPECREATORS_API_KEY",
} as const;

export const PARTNER_CONTENT_SEARCH_LIMITS = {
  recencyWindowMonths: 12,
  contentItemsPerPartnerPlatform: 50,
} as const;
