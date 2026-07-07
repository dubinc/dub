// Google Ads REST API version for listAccessibleCustomers at connect time.
// See https://developers.google.com/google-ads/api/docs/release-notes
export const GOOGLE_ADS_API_VERSION = "v21";

export const DATA_MANAGER_API_VERSION = "v1";

export const GOOGLE_ADS_CURRENCY = "USD" as const;

export const GOOGLE_ADS_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/datamanager.partnerlink",
  "https://www.googleapis.com/auth/adwords",
].join(" ");

export const GOOGLE_ADS_DEFAULT_SETTINGS = {
  customerId: null,
  customerIds: [],
  leadConversionActionId: null,
  saleConversionActionId: null,
};
