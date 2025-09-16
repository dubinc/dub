import z from "@/lib/zod";
import { HUBSPOT_OBJECT_TYPE_IDS } from "./constants";

// Authentication
export const hubSpotAuthTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  scopes: z.array(z.string()),
  hub_id: z.number(),
  expires_in: z.number().describe("Expires in seconds."),
  created_at: z.number(),
});

export const hubSpotRefreshTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  id_token: z.string().nullable(),
});

// CRM
export const hubSpotContactSchema = z.object({
  id: z.string(),
  properties: z.object({
    email: z.string(),
    firstname: z.string().nullable(),
    lastname: z.string().nullable(),
    phone: z.string().nullable(),
    dub_id: z.string().nullable(),
    createdate: z.string(),
  }),
});

export const hubSpotDealSchema = z.object({
  id: z.string(),
  properties: z.object({
    dealname: z.string(),
    amount: z.string(),
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
  subscriptionType: z.literal("object.creation"),
  objectTypeId: z.enum(HUBSPOT_OBJECT_TYPE_IDS),
});

export const hubSpotSaleEventSchema = z.object({
  objectId: z.number(),
  subscriptionType: z.literal("object.propertyChange"),
  propertyName: z.literal("dealstage"),
  propertyValue: z.string(), // eg: closedwon
});
