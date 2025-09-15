import z from "@/lib/zod";
import { HUBSPOT_OBJECT_TYPE_IDS } from "./constants";

export const hubSpotAuthTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  scopes: z.array(z.string()),
  expires_in: z.number(),
  hub_id: z.number(),
});

export const hubSpotWebhookSchema = z.object({
  portalId: z.number(),
  objectTypeId: z.enum(HUBSPOT_OBJECT_TYPE_IDS as [string, ...string[]]),
});

export const hubSpotContactSchema = z.object({
  id: z.string(),
  properties: z.object({
    email: z.string().nullable(),
    firstname: z.string().nullable(),
    lastname: z.string().nullable(),
    phone: z.string().nullable(),
    dub_id: z.string().nullable(),
    createdate: z.string(),
  }),
});

export const hubSpotRefreshTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  id_token: z.string().nullable(),
});
