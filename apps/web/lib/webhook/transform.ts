import { webhookPayloadSchema } from "@/lib/webhook/schemas";
import { nanoid, toCamelCase } from "@dub/utils";
import type { Link, Webhook } from "@prisma/client";
import { LinkWithTags, transformLink } from "../api/links/utils/transform-link";
import { WebhookTrigger } from "../types";
import z from "../zod";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { LinkSchema } from "../zod/schemas/links";
import { WEBHOOK_EVENT_ID_PREFIX } from "./constants";
import { clickEventSchema, leadEventSchema, saleEventSchema } from "./schemas";

interface TransformWebhookProps
  extends Pick<Webhook, "id" | "name" | "url" | "secret" | "triggers"> {
  links: { linkId: string }[];
}

// This is the format we send webhook details to the client
export const transformWebhook = (webhook: TransformWebhookProps) => {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    secret: webhook.secret,
    triggers: webhook.triggers,
    linkIds: webhook.links.map(({ linkId }) => linkId),
  };
};

// Note utm_* properties are not converted to camelCase
export const transformLinkEventData = (data: Link) => {
  return LinkSchema.parse({
    ...data,
    expiresAt: data.expiresAt?.toISOString() || null,
    lastClicked: data.lastClicked?.toISOString() || null,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
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

  // TODO: This is a bit flaky – e.g. if we add another boolean field to link schema
  // this will still break. We should make it more robust.
  const link = {
    ...transformLink(data.link),
    archived: data.link.archived === 1,
    doIndex: data.link.doIndex === 1,
    proxy: data.link.proxy === 1,
    publicStats: data.link.publicStats === 1,
    rewrite: data.link.rewrite === 1,
    trackConversion: data.link.trackConversion === 1,
  };

  return clickEventSchema.parse({
    ...click,
    link,
  });
};

export const transformLeadEventData = (data: any) => {
  const lead = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  return leadEventSchema.parse({
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
      qr: lead.qr === 1,
      bot: lead.bot === 1,
    },
    // transformLinkEventData -> normalize date to string
    // transformLink -> add shortLink, qrCode, workspaceId, etc.
    link: transformLinkEventData(transformLink(lead.link as LinkWithTags)),
  });
};

export const transformSaleEventData = (data: any) => {
  const sale = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  return saleEventSchema.parse({
    ...sale,
    customer: {
      id: sale.customerId,
      name: sale.customerName,
      email: sale.customerEmail,
      avatar: sale.customerAvatar,
    },
    sale: {
      amount: sale.amount,
      paymentProcessor: sale.paymentProcessor,
      invoiceId: sale.invoiceId,
      currency: sale.currency,
    },
    click: {
      ...sale,
      id: sale.clickId,
      qr: sale.qr === 1,
      bot: sale.bot === 1,
    },
    // transformLinkEventData -> normalize date to string
    // transformLink -> add shortLink, qrCode, workspaceId, etc.
    link: transformLinkEventData(transformLink(sale.link as LinkWithTags)),
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
