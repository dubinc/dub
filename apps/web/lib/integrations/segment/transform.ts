import { webhookPayloadSchema } from "@/lib/webhook/schemas";
import {
  ClickEventWebhookData,
  LeadEventWebhookData,
  SaleEventWebhookData,
} from "@/lib/webhook/types";
import { Link } from "@dub/prisma/client";
import { capitalize } from "@dub/utils";
import { z } from "zod";

const integration = {
  name: "dub",
  version: "1.0.0",
};

export const formatEventForSegment = (
  payload: z.infer<typeof webhookPayloadSchema>,
) => {
  const { event, data } = payload;

  switch (event) {
    case "link.clicked":
      return transformClickEvent(data);
    case "lead.created":
      return transformLeadEvent(data);
    case "sale.created":
      return transformSaleEvent(data);
    default:
      throw new Error(`Event ${event} is not supported for Segment.`);
  }
};

const transformClickEvent = (data: ClickEventWebhookData) => {
  const { click, link } = data;

  return {
    event: "Link Clicked",
    anonymousId: click.id,
    context: {
      ip: click.ip,
      integration,
      library: integration,
      ...buildCampaignContext(link),
    },
    properties: {
      click,
      link,
    },
  };
};

const transformLeadEvent = (data: LeadEventWebhookData) => {
  const { link, click, customer, eventName } = data;

  return {
    event: capitalize(eventName),
    userId: customer.externalId,
    context: {
      ip: click.ip,
      integration,
      library: integration,
      ...buildCampaignContext(link),
    },
    properties: {
      click,
      link,
      customer,
    },
  };
};

const transformSaleEvent = (data: SaleEventWebhookData) => {
  const { link, click, customer, sale, eventName } = data;

  return {
    event: capitalize(eventName),
    userId: customer.externalId,
    context: {
      ip: click.ip,
      integration,
      library: integration,
      ...buildCampaignContext(link),
    },
    properties: {
      click,
      link,
      customer,
      sale,
      revenue: sale.amount,
      currency: sale.currency,
    },
  };
};

const buildCampaignContext = (
  link: Pick<
    Link,
    "utm_campaign" | "utm_source" | "utm_medium" | "utm_term" | "utm_content"
  >,
) => {
  const campaign = {
    ...(link.utm_campaign && { name: link.utm_campaign }),
    ...(link.utm_source && { source: link.utm_source }),
    ...(link.utm_medium && { medium: link.utm_medium }),
    ...(link.utm_term && { term: link.utm_term }),
    ...(link.utm_content && { content: link.utm_content }),
  };

  if (Object.keys(campaign).length === 0) {
    return undefined;
  }

  return {
    campaign,
  };
};
