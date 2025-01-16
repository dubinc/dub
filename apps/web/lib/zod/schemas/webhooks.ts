import { WEBHOOK_TRIGGERS } from "@/lib/webhook/constants";
import { z } from "zod";
import { parseUrlSchema } from "./utils";

export const WebhookSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  secret: z.string(),
  triggers: z.array(z.enum(WEBHOOK_TRIGGERS)),
  disabledAt: z.date().nullable(),
  linkIds: z.array(z.string()).optional(),
  installationId: z.string().nullable(),
});

export const createWebhookSchema = z.object({
  name: z.string().min(1).max(40),
  url: parseUrlSchema,
  secret: z.string().optional(),
  triggers: z.array(z.enum(WEBHOOK_TRIGGERS)),
  linkIds: z.array(z.string()).optional(),
});

export const updateWebhookSchema = createWebhookSchema.partial();

// Schema of response sent to the webhook callback URL by QStash
export const webhookCallbackSchema = z.object({
  status: z.number(),
  url: z.string(),
  createdAt: z.number(),
  sourceMessageId: z.string(),
  body: z.string().optional().default(""), // Response from the original webhook URL
  sourceBody: z.string(), // Original request payload from Dub
});

// Webhook event schema for the webhook logs
export const webhookEventSchemaTB = z.object({
  event_id: z.string(),
  webhook_id: z.string(),
  message_id: z.string(), // QStash message ID
  event: z.enum(WEBHOOK_TRIGGERS),
  url: z.string(),
  http_status: z.number(),
  request_body: z.string(),
  response_body: z.string(),
  timestamp: z.string(),
});
