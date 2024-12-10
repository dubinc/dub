import { webhookPayloadSchema } from "@/lib/webhook/schemas";
import {
  ClickEventWebhookData,
  LeadEventWebhookData,
  SaleEventWebhookData,
} from "@/lib/webhook/types";
import { Link } from "@prisma/client";
import { z } from "zod";

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
    event: "Link clicked",
    anonymousId: click.id,
    context: {
      ip: click.ip,
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
    event: eventName,
    userId: customer.externalId,
    context: {
      ip: click.ip,
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
    event: eventName,
    userId: customer.externalId,
    context: {
      ip: click.ip,
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

const buildCampaignContext = (link: Link) => {
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
