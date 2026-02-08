import * as z from "zod/v4";
import {
  HUBSPOT_OBJECT_TYPE_IDS,
  LEAD_TRIGGER_EVENT_OPTIONS,
} from "./constants";

// Authentication
export const hubSpotAuthTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  scopes: z.array(z.string()),
  hub_id: z.number(),
  expires_in: z.number().describe("Expires in seconds."),
  created_at: z.number().optional(),
});

// Integration settings
export const hubSpotSettingsSchema = z.object({
  leadTriggerEvent: z
    .enum(LEAD_TRIGGER_EVENT_OPTIONS)
    .nullish()
    .default("dealCreated")
    .describe(
      "Indicates which event should trigger the final lead tracking for the contact.",
    ),
  leadLifecycleStageId: z
    .string()
    .nullish()
    .describe(
      "The ID of the contact lifecycle stage that represents a lead. Applicable only if leadTrackingTrigger is 'lifecycleStageReached'.",
    ),
  closedWonDealStageId: z
    .string()
    .nullish()
    .default("closedwon")
    .describe("The ID of the deal stage that represents a closed won deal."),
});

// CRM
export const hubSpotContactSchema = z.object({
  id: z.string(),
  properties: z.object({
    email: z.string(),
    firstname: z.string().nullable(),
    lastname: z.string().nullable(),
    dub_id: z.string().nullish(),
    dub_link: z.string().nullish(),
    dub_partner_email: z.string().nullish(),
    lifecyclestage: z.string().nullish(),
  }),
});

export const hubSpotDealSchema = z.object({
  id: z.string(),
  properties: z.object({
    dealname: z.string(),
    amount: z.string().nullable(),
    dealstage: z.string(),
  }),
  associations: z.object({
    contacts: z.object({
      results: z.array(
        z.object({
          id: z.string(),
          type: z.string(),
        }),
      ),
    }),
  }),
});

// Webhooks
export const hubSpotWebhookSchema = z.object({
  portalId: z.number(),
  objectTypeId: z.enum(HUBSPOT_OBJECT_TYPE_IDS),
  subscriptionType: z.enum(["object.creation", "object.propertyChange"]),
});

export const hubSpotLeadEventSchema = z.object({
  objectId: z.number(),
  subscriptionType: z.enum(["object.propertyChange", "object.creation"]),
  objectTypeId: z.enum(HUBSPOT_OBJECT_TYPE_IDS),
});

export const hubSpotSaleEventSchema = z.object({
  objectId: z.number(),
  subscriptionType: z.literal("object.propertyChange"),
  propertyName: z.literal("dealstage"),
  propertyValue: z.string(), // eg: closedwon
});
