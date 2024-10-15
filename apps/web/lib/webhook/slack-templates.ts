import { LinkWebhookEvent } from "dub/models/components";
import { WebhookTrigger } from "../types";
import {
  ClickEventWebhookData,
  LeadEventWebhookData,
  SaleEventWebhookData,
} from "./types";

const createLinkTemplate = ({
  data,
  eventType,
}: {
  data: LinkWebhookEvent["data"];
  eventType: WebhookTrigger;
}) => {
  const eventMessages = {
    "link.created": "*New short link created*",
    "link.updated": "*Short link updated*",
    "link.deleted": "*Short link deleted*",
  };

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: eventMessages[eventType],
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
    ],
  };
};

const createLeadTemplate = ({ data }: { data: LeadEventWebhookData }) => {
  const { customer, click, link } = data;

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
            text: `*Customer:*\n${customer.name}`,
          },
          {
            type: "mrkdwn",
            text: `*Email*\n<mailto:${customer.email}|${customer.email}>`,
          },
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
    ],
  };
};

const createSaleTemplate = ({ data }: { data: SaleEventWebhookData }) => {
  const { customer, click, sale } = data;
  const amountInDollars = (sale.amount / 100).toFixed(2);

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
          {
            type: "mrkdwn",
            text: `*Country*\n${click.country}`,
          },
          {
            type: "mrkdwn",
            text: `*Amount*\n${amountInDollars}`,
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
  "lead.created": createLeadTemplate,
  "sale.created": createSaleTemplate,
  "link.clicked": clickLinkTemplate,
};

export const generateSlackMessage = (
  eventType: WebhookTrigger,
  data: LinkWebhookEvent["data"],
) => {
  const template = slackTemplates[eventType];

  if (!template) {
    throw new Error(`No Slack template found for event type: ${eventType}`);
  }

  const isLinkEvent = ["link.created", "link.updated", "link.deleted"].includes(
    eventType,
  );

  return template({
    data,
    ...(isLinkEvent && { eventType }),
  });
};
