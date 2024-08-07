import { webhookTrigger } from "@/lib/webhook/constants";
import { z } from "zod";
import { clickEventSchemaTB } from "./clicks";
import { LinkSchema } from "./links";

export const webhookSchema = z.object({
  id: z.string(),
  linkId: z.string().optional(),
  name: z.string(),
  url: z.string(),
  secret: z.string(),
  active: z.boolean().default(true),
  triggers: z.array(z.enum(webhookTrigger)),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createWebhookSchema = z.object({
  name: z.string().min(3).max(50),
  url: z.string().url().max(190),
  secret: z.string().length(40),
  triggers: z.array(z.enum(webhookTrigger)),
});

export const updateWebhookSchema = createWebhookSchema.partial();

export const webhookEventSchema = z.object({
  id: z.string(),
  event: z.string(),
  createdAt: z.string(),
  data: z.union([LinkSchema, clickEventSchemaTB]),
});
