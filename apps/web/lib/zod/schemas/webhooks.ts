import { z } from "zod";

// Webhook sources
const webhookSource = ["zapier", "make", "user"] as const;

// Webhook triggers
const webhookTrigger = ["link.created", "link.clicked"] as const;

export const webhookSchema = z.object({
  id: z.string(),
  linkId: z.string().optional(),
  name: z.string(),
  url: z.string(),
  secret: z.string(),
  active: z.boolean().default(true),
  source: z.enum(webhookSource),
  triggers: z.array(z.enum(webhookTrigger)),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createWebhookSchema = z.object({
  name: z.string().min(3).max(50),
  url: z.string().url().max(190),
  secret: z.string().length(40),
  source: z.enum(webhookSource),
  triggers: z.array(z.enum(webhookTrigger)),
});
