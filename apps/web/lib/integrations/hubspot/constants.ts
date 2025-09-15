import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || "";

export const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || "";

export const HUBSPOT_REDIRECT_URI =
  process.env.HUBSPOT_REDIRECT_URI ||
  `${APP_DOMAIN_WITH_NGROK}/api/hubspot/callback`;

export const HUBSPOT_APP_SCOPES = [
  "oauth",
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.leads.read",
  "crm.objects.deals.read",
];

export const HUBSPOT_STATE_CACHE_PREFIX = "hubspot:install:state";
