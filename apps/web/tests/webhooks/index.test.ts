import { qstash } from "@/lib/cron";
import { WebhookTrigger } from "@/lib/types";
import { WEBHOOK_TRIGGERS } from "@/lib/webhook/constants";
import { sendWebhooks } from "@/lib/webhook/qstash";
import { samplePayload } from "@/lib/webhook/sample-events/payload";
import {
  clickWebhookEventSchema,
  leadWebhookEventSchema,
  saleWebhookEventSchema,
} from "@/lib/webhook/schemas";
import z from "@/lib/zod";
import { CustomerSchema } from "@/lib/zod/schemas/customers";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import { WebhookEvent } from "dub/models/components";
import { describe, expect, test } from "vitest";

const webhook = {
  id: "wh_IFL4j0toU6RAMz4R7mXjJ6C5", // dummy id
  url: "https://webhook.site/30fb66a9-3611-4878-a8c9-49ab4806a2c0",
  secret: "whsec_6f9f3a63705c44206ca655813bf91b61", // dummy secret
};

const customerSchemaExtended = CustomerSchema.extend({
  createdAt: z.string().transform((str) => new Date(str)), // because the date is in UTC string in JSON
});

const leadWebhookEventSchemaExtended = leadWebhookEventSchema.extend({
  customer: customerSchemaExtended,
});

const saleWebhookEventSchemaExtended = saleWebhookEventSchema.extend({
  customer: customerSchemaExtended,
});

const eventSchemas: Record<WebhookTrigger, z.ZodSchema> = {
  "link.created": linkEventSchema,
  "link.updated": linkEventSchema,
  "link.deleted": linkEventSchema,
  "link.clicked": clickWebhookEventSchema,
  "lead.created": leadWebhookEventSchemaExtended,
  "sale.created": saleWebhookEventSchemaExtended,
};

describe("Webhooks", () => {
  test.each(WEBHOOK_TRIGGERS)(
    "%s",
    async (trigger: WebhookTrigger) => await testWebhookEvent(trigger),
    10000,
  );
});

const testWebhookEvent = async (trigger: WebhookTrigger) => {
  const data = samplePayload[trigger];

  const response = await sendWebhooks({
    webhooks: [webhook],
    trigger,
    data,
  });

  if (!response) {
    throw new Error("No response from sendWebhooks");
  }

  await assertQstashMessage(response[0].messageId, data, trigger);
};

const assertQstashMessage = async (
  messageId: string,
  body: any,
  trigger: WebhookTrigger,
) => {
  const qstashMessage = await qstash.messages.get(messageId);

  console.log(`Got qstash message for ${trigger}`, qstashMessage.messageId);

  const callbackUrl = new URL(qstashMessage.callback!);
  const failureCallbackUrl = new URL(qstashMessage.failureCallback!);
  const receivedBody = JSON.parse(qstashMessage.body!) as WebhookEvent;

  expect(qstashMessage.url).toEqual(webhook.url);
  expect(qstashMessage.method).toEqual("POST");

  expect(callbackUrl.searchParams.get("webhookId")).toEqual(webhook.id);
  expect(callbackUrl.searchParams.get("event")).toEqual(trigger);
  expect(callbackUrl.searchParams.get("eventId")?.startsWith("evt_")).toBe(
    true,
  );

  expect(failureCallbackUrl.searchParams.get("webhookId")).toEqual(webhook.id);
  expect(failureCallbackUrl.searchParams.get("event")).toEqual(trigger);
  expect(
    failureCallbackUrl.searchParams.get("eventId")?.startsWith("evt_"),
  ).toBe(true);

  expect(receivedBody.event).toEqual(trigger);
  expect(receivedBody.data).toEqual(body);

  expect(eventSchemas[trigger].safeParse(receivedBody.data).success).toBe(true);
};

// TODO:
// Assert the signature is correct
// Check the webhook URL received the event
