import {
  WEBHOOK_SECRET_PREFIX,
  WEBHOOK_TRIGGERS,
} from "@/lib/webhook/constants";
import { z } from "zod";

//whsec_646072a9e9c28e22c8170ec50eba8e0f5dda32a21ac663771d9e901fe6bb25c1

export const webhookSchema = z.object({
  id: z.string(),
  linkId: z.string().optional(),
  name: z.string(),
  url: z.string(),
  secret: z.string(),
  triggers: z.array(z.enum(WEBHOOK_TRIGGERS)),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createWebhookSchema = z.object({
  name: z.string().min(1).max(30),
  url: z.string().url().max(190),
  secret: z.string().startsWith(WEBHOOK_SECRET_PREFIX),
  triggers: z.array(z.enum(WEBHOOK_TRIGGERS)),
  linkId: z.string().optional(),
});

export const updateWebhookSchema = createWebhookSchema.partial();

export const webhookEventSchemaTB = z.object({
  event_id: z.string(),
  webhook_id: z.string(),
  url: z.string(),
  event_type: z.enum(WEBHOOK_TRIGGERS),
  status_code: z.number(),
  request: z.string(),
  response: z.string(),
});

// Represents the schema of the payload sent to the webhook endpoint
export const webhookPayloadSchema = z.object({
  event: z.enum(WEBHOOK_TRIGGERS),
  webhookId: z.string(),
  createdAt: z.string(),
  data: z.any(),
});
