import { WEBHOOK_TRIGGERS } from "@/lib/webhook/constants";
import { WebhookTrigger } from "@/lib/webhook/types";
import { WebhookScope } from "@prisma/client";
import * as z from "zod/v4";
import { parseUrlSchema } from "./utils";

export const WebhookSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  secret: z.string(),
  triggers: z.array(z.enum(WEBHOOK_TRIGGERS)),
  scope: z.enum(WebhookScope).nullable(),
  disabledAt: z.date().nullable(),
  installationId: z.string().nullable(),
});

const validateWebhook = (
  data: {
    triggers: WebhookTrigger[];
    scope?: WebhookScope | null;
    linkIds?: string[] | null;
    folderIds?: string[] | null;
  },
  ctx: z.RefinementCtx,
) => {
  // Only enforce when triggers are provided
  if (!data.triggers) {
    return;
  }

  if (!data.triggers.includes("link.clicked")) {
    if (data.scope) {
      ctx.addIssue({
        code: "custom",
        path: ["scope"],
        message: `"scope" can only be set when the "link.clicked" trigger is enabled.`,
      });
    }
    return;
  }

  if (!data.scope) {
    ctx.addIssue({
      code: "custom",
      path: ["scope"],
      message: `"scope" is required when the "link.clicked" trigger is enabled.`,
    });
    return;
  }

  if (data.scope === "links" && data.linkIds?.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["linkIds"],
      message: "Select at least one link",
    });
  }

  if (data.scope === "folders" && data.folderIds?.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["folderIds"],
      message: "Select at least one folder.",
    });
  }
};

export const createWebhookSchemaBase = z.object({
  name: z.string().min(1).max(40),
  url: parseUrlSchema,
  triggers: z.array(z.enum(WEBHOOK_TRIGGERS)),
  scope: z.enum(WebhookScope).nullish(),
  linkIds: z.array(z.string()).nullish(),
  folderIds: z.array(z.string()).nullish(),
});

export const createWebhookSchema =
  createWebhookSchemaBase.superRefine(validateWebhook);

export const updateWebhookSchema = createWebhookSchemaBase
  .partial()
  .superRefine(validateWebhook);

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
  event: z.enum([
    "partner.created", // keeping this for backwards compatibility
    ...WEBHOOK_TRIGGERS,
  ]),
  url: z.string(),
  http_status: z.number(),
  request_body: z.string(),
  response_body: z.string(),
  timestamp: z.string(),
});
