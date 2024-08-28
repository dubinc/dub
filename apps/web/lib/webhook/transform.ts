import { nanoid, toCamelCase } from "@dub/utils";
import type { Link, Webhook } from "@prisma/client";
import { WebhookTrigger } from "../types";
import { LinkSchema } from "../zod/schemas/links";
import { webhookPayloadSchema } from "../zod/schemas/webhooks";
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
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
    expiresAt: data.expiresAt?.toISOString() || null,
  });
};

export const transformClickEventData = (data: any) => {
  const click = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  return clickEventSchema.parse({
    ...click,
    id: click.clickId,
    link: {
      id: click.linkId,
      url: click.url,
    },
  });
};

export const transformLeadEventData = (data: any) => {
  const lead = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  return leadEventSchema.parse({
    ...lead,
    click: {
      ...lead,
      id: lead.clickId,
      qr: lead.qr === 1,
      bot: lead.bot === 1,
    },
    link: {
      id: lead.linkId,
      externalId: lead.externalId,
      domain: lead.domain,
      key: lead.key,
    },
  });
};

export const transformSaleEventData = (data: any) => {
  const sale = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  return saleEventSchema.parse({
    ...sale,
    click: {
      ...sale,
      id: sale.clickId,
      qr: sale.qr === 1,
      bot: sale.bot === 1,
    },
    link: {
      id: sale.linkId,
    },
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
