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
import { BountySchema } from "@/lib/zod/schemas/bounties";
import { CommissionWebhookSchema } from "@/lib/zod/schemas/commissions";
import { CustomerSchema } from "@/lib/zod/schemas/customers";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { payoutWebhookEventSchema } from "@/lib/zod/schemas/payouts";
import { partnerApplicationWebhookSchema } from "@/lib/zod/schemas/program-application";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";

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

const enrolledPartnerSchemaExtended = EnrolledPartnerSchema.extend({
  payoutsEnabledAt: z.string().nullable(),
  createdAt: z.string(),
});

const commissionWebhookEventSchemaExtended = CommissionWebhookSchema.extend({
  createdAt: z.string().transform((str) => new Date(str)),
  updatedAt: z.string().transform((str) => new Date(str)),
  partner: CommissionWebhookSchema.shape.partner.extend({
    payoutsEnabledAt: z
      .string()
      .transform((str) => (str ? new Date(str) : null))
      .nullable(),
  }),
  customer: customerSchemaExtended,
});

const bountyWebhookEventSchemaExtended = BountySchema.extend({
  startsAt: z.string().transform((str) => new Date(str)),
  endsAt: z.string().transform((str) => (str ? new Date(str) : null)),
});

const payoutWebhookEventSchemaExtended = payoutWebhookEventSchema.extend({
  periodStart: z
    .string()
    .nullable()
    .transform((str) => (str ? new Date(str) : null)),
  periodEnd: z
    .string()
    .nullable()
    .transform((str) => (str ? new Date(str) : null)),
  createdAt: z.string().transform((str) => new Date(str)),
  initiatedAt: z.string().transform((str) => new Date(str)),
  paidAt: z
    .string()
    .nullable()
    .transform((str) => (str ? new Date(str) : null)),
});

const eventSchemas: Record<WebhookTrigger, z.ZodSchema> = {
  "link.created": linkEventSchema,
  "link.updated": linkEventSchema,
  "link.deleted": linkEventSchema,
  "link.clicked": clickWebhookEventSchema,
  "lead.created": leadWebhookEventSchemaExtended,
  "sale.created": saleWebhookEventSchemaExtended,
  "partner.application_submitted": partnerApplicationWebhookSchema,
  "partner.enrolled": enrolledPartnerSchemaExtended,
  "commission.created": commissionWebhookEventSchemaExtended,
  "bounty.created": bountyWebhookEventSchemaExtended,
  "bounty.updated": bountyWebhookEventSchemaExtended,
  "payout.confirmed": payoutWebhookEventSchemaExtended,
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

  const callbackUrl = new URL(qstashMessage.callback!);
  const failureCallbackUrl = new URL(qstashMessage.failureCallback!);
  const receivedBody = JSON.parse(qstashMessage.body!);

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
