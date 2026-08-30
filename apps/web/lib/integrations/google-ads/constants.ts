import { DUB_WORKSPACE_ID } from "@dub/utils";

export const GOOGLE_ADS_LOGO =
  "https://dubassets.com/integrations/int_1M096GK5Q66FJ78WQAH82SD7V_5icvkj4";

export const GOOGLE_ADS_DEFAULT_SETTINGS = {
  customers: [],
  customerId: null,
  loginCustomerId: null,
  customerName: null,
  leadMappings: [],
  saleMappings: [],
} as const;

export const GOOGLE_ADS_OAUTH_SCOPE = [
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/datamanager",
].join(" ");

export const GOOGLE_ADS_API_VERSION = "v22";

export const GOOGLE_ADS_ALLOWED_WORKSPACE_IDS = new Set<string>([
  DUB_WORKSPACE_ID,
]);
