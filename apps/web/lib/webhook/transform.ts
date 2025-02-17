import {
  clickWebhookEventSchema,
  webhookPayloadSchema,
} from "@/lib/webhook/schemas";
import { Webhook } from "@dub/prisma/client";
import { nanoid, toCamelCase } from "@dub/utils";
import { ExpandedLink, transformLink } from "../api/links/utils/transform-link";
import { generateRandomName } from "../names";
import { WebhookTrigger } from "../types";
import z from "../zod";
import { clickEventSchema, clickEventSchemaTB } from "../zod/schemas/clicks";
import { WebhookSchema } from "../zod/schemas/webhooks";
import { WEBHOOK_EVENT_ID_PREFIX } from "./constants";
import { leadWebhookEventSchema, saleWebhookEventSchema } from "./schemas";

interface TransformWebhookProps
  extends Pick<
    Webhook,
    "id" | "name" | "url" | "secret" | "triggers" | "disabledAt"
  > {
  links: { linkId: string }[];
}

// This is the format we send webhook details to the client
export const transformWebhook = (webhook: TransformWebhookProps) => {
  return WebhookSchema.parse({
    ...webhook,
    linkIds: webhook.links.map(({ linkId }) => linkId),
  });
};

export const transformClickEventData = (
  data: z.infer<typeof clickEventSchemaTB> & {
    link: any;
  },
) => {
  const click = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  return clickWebhookEventSchema.parse({
    ...click,
    click: clickEventSchema.parse({
      ...click,
      timestamp: new Date(click.timestamp),
      id: click.clickId,
    }),
  });
};

const transformWebhookCustomer = (customer: any) => {
  return {
    ...customer,
    name: customer.name || customer.email || generateRandomName(),
    externalId: customer.externalId || "",
    country: undefined,
    avatar:
      customer.avatar ||
      `https://api.dicebear.com/9.x/notionists/svg?seed=${customer.id}`,
  };
};

export const transformLeadEventData = (data: any) => {
  const lead = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  const { customer } = data;

  return leadWebhookEventSchema.parse({
    ...lead,
    customer: transformWebhookCustomer(customer),
    click: {
      ...lead,
      id: lead.clickId,
      timestamp: new Date(lead.timestamp + "Z"),
    },
    // transformLink -> add shortLink, qrCode, workspaceId, etc.
    link: transformLink(lead.link as ExpandedLink),
  });
};

export const transformSaleEventData = (data: any) => {
  const sale = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  const { customer } = data;

  return saleWebhookEventSchema.parse({
    ...sale,
    customer: transformWebhookCustomer(customer),
    sale: {
      amount: sale.amount,
      currency: sale.currency,
      paymentProcessor: sale.paymentProcessor,
      invoiceId: sale.invoiceId,
    },
    click: {
      ...sale,
      id: sale.clickId,
      timestamp: sale.clickedAt,
      qr: sale.qr === 1,
      bot: sale.bot === 1,
    },
    // transformLink -> add shortLink, qrCode, workspaceId, etc.
    link: transformLink(sale.link as ExpandedLink),
  });
};

// Transform the payload to the format expected by the webhook
export const prepareWebhookPayload = (trigger: WebhookTrigger, data: any) => {
  return webhookPayloadSchema.parse({
    id: `${WEBHOOK_EVENT_ID_PREFIX}${nanoid(25)}`,
    data: data,
    event: trigger,
    createdAt: new Date().toISOString(),
  });
};
