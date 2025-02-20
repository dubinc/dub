import { APP_DOMAIN } from "@dub/utils";
import { LinkWebhookEvent } from "dub/models/components";
import { z } from "zod";
import { WebhookTrigger } from "../../types";
import { webhookPayloadSchema } from "../../webhook/schemas";
import {
  ClickEventWebhookData,
  LeadEventWebhookData,
  PartnerEventDataProps,
  SaleEventWebhookData,
} from "../../webhook/types";

const createLinkTemplate = ({
  data,
  event,
}: {
  data: LinkWebhookEvent["data"];
  event: WebhookTrigger;
}) => {
  const eventMessages = {
    "link.created": "*New short link created* :link:",
    "link.updated": "*Short link updated* :link:",
    "link.deleted": "*Short link deleted* :link:",
  };

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: eventMessages[event],
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Short link*\n<${data.shortLink}|${data.shortLink}>\n`,
          },
          {
            type: "mrkdwn",
            text: `*Destination URL*\n<${data.url}|${data.url}>\n`,
          },
        ],
      },
    ],
  };
};

const clickLinkTemplate = ({ data }: { data: ClickEventWebhookData }) => {
  const { link, click } = data;
  const linkToClicks = `${APP_DOMAIN}/events?event=clicks&domain=${link.domain}&key=${link.key}`;

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Someone clicked your short link* :eyes:`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Country*\n${click.country}`,
          },
          {
            type: "mrkdwn",
            text: `*Referrer*\n${click.referer}`,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Short link*\n<${link.shortLink}|${link.shortLink}>`,
          },
          {
            type: "mrkdwn",
            text: `*Destination URL*\n<${link.url}|${link.url}>`,
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `<${linkToClicks}|View on Dub>`,
          },
        ],
      },
    ],
  };
};

const createLeadTemplate = ({ data }: { data: LeadEventWebhookData }) => {
  const { customer, click, link } = data;
  const linkToLeads = `${APP_DOMAIN}/events?event=leads&domain=${link.domain}&key=${link.key}`;

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*New lead created* :tada:",
        },
        fields: [
          {
            type: "mrkdwn",
            text: `*Customer*\n${customer.name}`,
          },
          {
            type: "mrkdwn",
            text: `*Email*\n<mailto:${customer.email}|${customer.email}>`,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Country*\n${click.country}`,
          },
          {
            type: "mrkdwn",
            text: `*Short link*\n<${link.shortLink}|${link.shortLink}>`,
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `<${linkToLeads}|View on Dub>`,
          },
        ],
      },
    ],
  };
};

const createSaleTemplate = ({ data }: { data: SaleEventWebhookData }) => {
  const { customer, click, sale, link } = data;
  const amountInDollars = (sale.amount / 100).toFixed(2);
  const linkToSales = `${APP_DOMAIN}/events?event=sales&domain=${link.domain}&key=${link.key}`;

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*New sale created* :moneybag:",
        },
        fields: [
          {
            type: "mrkdwn",
            text: `*Customer*\n${customer.name}`,
          },
          {
            type: "mrkdwn",
            text: `*Email*\n<mailto:${customer.email}|${customer.email}>`,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Country*\n${click.country}`,
          },
          {
            type: "mrkdwn",
            text: `*Amount*\n${amountInDollars} ${sale.currency.toUpperCase()}`,
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `<${linkToSales}|View on Dub>`,
          },
        ],
      },
    ],
  };
};

const createPartnerTemplate = ({ data }: { data: PartnerEventDataProps }) => {
  const { name, email, country } = data;

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New partner created* :tada:`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Name*\n${name}`,
          },
          {
            type: "mrkdwn",
            text: `*Email*\n<mailto:${email}|${email}>`,
          },
          {
            type: "mrkdwn",
            text: `*Country*\n${country}`,
          },
        ],
      },
    ],
  };
};

const slackTemplates: Record<WebhookTrigger, any> = {
  "link.created": createLinkTemplate,
  "link.updated": createLinkTemplate,
  "link.deleted": createLinkTemplate,
  "link.clicked": clickLinkTemplate,
  "lead.created": createLeadTemplate,
  "sale.created": createSaleTemplate,
  "partner.created": createPartnerTemplate,
};

export const formatEventForSlack = (
  payload: z.infer<typeof webhookPayloadSchema>,
) => {
  const { event, data } = payload;
  const template = slackTemplates[event];

  if (!template) {
    throw new Error(`No Slack template found for event type: ${event}`);
  }

  const isLinkEvent = ["link.created", "link.updated", "link.deleted"].includes(
    event,
  );

  return template({
    data,
    ...(isLinkEvent && { event }),
  });
};
