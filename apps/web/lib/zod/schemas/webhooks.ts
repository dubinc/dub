import {
  WEBHOOK_SECRET_PREFIX,
  WEBHOOK_TRIGGERS,
} from "@/lib/webhook/constants";
import { z } from "zod";

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
  message_id: z.string(), // QStash message ID
  url: z.string(),
  event: z.enum(WEBHOOK_TRIGGERS),
  http_status: z.number(),
  request_body: z.string(),
  response_body: z.string(),
});

// Schema of the payload sent to the webhook endpoint
export const webhookPayloadSchema = z.object({
  event: z.enum(WEBHOOK_TRIGGERS),
  webhookId: z.string(),
  createdAt: z.string(),
  data: z.any(),
});

// Schema of the payload sent to /webhooks/callback endpoint from QStash
export const webhookCallbackSchema = z.object({
  status: z.number(),
  url: z.string(),
  createdAt: z.number(),
  sourceMessageId: z.string(),
  body: z.string().optional().default(""), // Response from the users webhook URL
  sourceBody: z.string(), // Original request payload from Dub
});
