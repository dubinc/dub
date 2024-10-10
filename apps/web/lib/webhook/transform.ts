import {
  clickWebhookEventSchema,
  webhookPayloadSchema,
} from "@/lib/webhook/schemas";
import { nanoid, toCamelCase } from "@dub/utils";
import type { Webhook } from "@prisma/client";
import { LinkWithTags, transformLink } from "../api/links/utils/transform-link";
import { WebhookTrigger } from "../types";
import z from "../zod";
import { clickEventSchema, clickEventSchemaTB } from "../zod/schemas/clicks";
import { webhookSchema } from "../zod/schemas/webhooks";
import { WEBHOOK_EVENT_ID_PREFIX } from "./constants";
import { leadWebhookEventSchema, saleWebhookEventSchema } from "./schemas";

interface TransformWebhookProps
  extends Pick<
    Webhook,
    "id" | "name" | "url" | "secret" | "triggers" | "disabled"
  > {
  links: { linkId: string }[];
}

// This is the format we send webhook details to the client
export const transformWebhook = (webhook: TransformWebhookProps) => {
  return webhookSchema.parse({
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
      id: click.clickId,
    }),
  });
};

export const transformLeadEventData = (data: any) => {
  const lead = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  return leadWebhookEventSchema.parse({
    ...lead,
    customer: {
      id: lead.customerId,
      name: lead.customerName,
      email: lead.customerEmail,
      avatar:
        lead.customerAvatar ||
        `https://api.dicebear.com/7.x/micah/svg?seed=${lead.customerId}`,
    },
    click: {
      ...lead,
      id: lead.clickId,
    },
    // transformLink -> add shortLink, qrCode, workspaceId, etc.
    link: transformLink(lead.link as LinkWithTags),
  });
};

export const transformSaleEventData = (data: any) => {
  const sale = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  return saleWebhookEventSchema.parse({
    ...sale,
    customer: {
      id: sale.customerId,
      name: sale.customerName,
      email: sale.customerEmail,
      avatar: sale.customerAvatar,
    },
    sale: {
      amount: sale.amount,
      currency: sale.currency,
      paymentProcessor: sale.paymentProcessor,
      invoiceId: sale.invoiceId,
    },
    click: {
      ...sale,
      id: sale.clickId,
      qr: sale.qr === 1,
      bot: sale.bot === 1,
    },
    // transformLink -> add shortLink, qrCode, workspaceId, etc.
    link: transformLink(sale.link as LinkWithTags),
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
