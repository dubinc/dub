import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || "";

export const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || "";

export const HUBSPOT_REDIRECT_URI =
  process.env.HUBSPOT_REDIRECT_URI ||
  `${APP_DOMAIN_WITH_NGROK}/api/hubspot/callback`;

export const HUBSPOT_API_HOST = "https://api.hubapi.com";

export const HUBSPOT_APP_SCOPES = [
  "oauth",
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.deals.read",
  "crm.schemas.contacts.write",
];

export const HUBSPOT_STATE_CACHE_PREFIX = "hubspot:install:state";

export const HUBSPOT_OBJECT_TYPE_IDS = [
  "0-1", // contact
  "0-3", // deal
] as const;

export const HUBSPOT_DEFAULT_CLOSED_WON_DEAL_STAGE_ID = "closedwon";

export const HUBSPOT_DUB_CONTACT_PROPERTIES = [
  {
    label: "Dub Id",
    name: "dub_id",
    type: "string",
    fieldType: "text",
    groupName: "contactinformation",
    formField: true, // Allow the property to be used in a HubSpot form.
  },
  {
    label: "Dub Link",
    name: "dub_link",
    type: "string",
    fieldType: "text",
    groupName: "contactinformation",
  },
  {
    label: "Dub Partner Email",
    name: "dub_partner_email",
    type: "string",
    fieldType: "text",
    groupName: "contactinformation",
  },
];
