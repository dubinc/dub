import { webhookTriggers } from "@/lib/webhook/constants";
import { z } from "zod";

export const webhookSchema = z.object({
  id: z.string(),
  linkId: z.string().optional(),
  name: z.string(),
  url: z.string(),
  secret: z.string(),
  active: z.boolean().default(true),
  triggers: z.array(z.enum(webhookTriggers)),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createWebhookSchema = z.object({
  name: z.string().min(3).max(50),
  url: z.string().url().max(190),
  secret: z.string().length(40),
  triggers: z.array(z.enum(webhookTriggers)),
});

export const updateWebhookSchema = createWebhookSchema.partial();

export const webhookEventSchemaTB = z.object({
  event_id: z.string(),
  webhook_id: z.string(),
  url: z.string(),
  event_type: z.enum(webhookTriggers),
  status_code: z.number(),
  request: z.string(),
  response: z.string(),
});

// Represents the schema of the payload sent to the webhook endpoint
export const webhookPayloadSchema = z.object({
  event: z.enum(webhookTriggers),
  webhookId: z.string(),
  createdAt: z.string(),
  data: z.any(),
});
