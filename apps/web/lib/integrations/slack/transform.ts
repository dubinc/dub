import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { APP_DOMAIN, COUNTRIES } from "@dub/utils";
import { LinkWebhookEvent } from "dub/models/components";
import * as z from "zod/v4";
import { webhookPayloadSchema } from "../../webhook/schemas";
import type { WebhookTrigger } from "../../webhook/types";
import {
  ClickEventWebhookPayload,
  LeadEventWebhookPayload,
  SaleEventWebhookPayload,
} from "../../webhook/types";

const linkTemplates = ({
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

const linkClickedTemplate = ({ data }: { data: ClickEventWebhookPayload }) => {
  const { link, click } = data;
  const hrefToClicks = `${APP_DOMAIN}/events?event=clicks&domain=${link.domain}&key=${link.key}`;

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
            text: `<${hrefToClicks}|View on Dub>`,
          },
        ],
      },
    ],
  };
};

const leadCreatedTemplate = ({ data }: { data: LeadEventWebhookPayload }) => {
  const { customer, click, link } = data;
  const hrefToCustomerPage = `${APP_DOMAIN}/customers/${customer.id}`;
  const hrefToLinkPage = `${APP_DOMAIN}/links/${link.domain}/${link.key}`;

  const quickLinks = [
    `<${hrefToCustomerPage}|Customer>`,
    `<${hrefToLinkPage}|Link>`,
  ];

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
            text: `*Customer*\n<${hrefToCustomerPage}|${customer.name}> (<${hrefToCustomerPage}|\`${customer.email}\`>)`,
          },
          {
            type: "mrkdwn",
            text: `*Country*\n:flag-${click.country.toLowerCase()}: ${COUNTRIES[click.country]}`,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Link*\n<${hrefToLinkPage}|${link.domain}/${link.key}>`,
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `View on Dub: ${quickLinks.join(" | ")}`,
          },
        ],
      },
    ],
  };
};

const saleCreatedTemplate = ({ data }: { data: SaleEventWebhookPayload }) => {
  const { customer, click, sale, link } = data;
  const amountInDollars = (sale.amount / 100).toFixed(2);
  const isNewSaleType = isFirstConversion({
    customer: {
      sales: customer.sales || 0,
      linkId: link.id,
    },
    linkId: link.id,
  });
  const hrefToCustomerPage = `${APP_DOMAIN}/customers/${customer.id}`;
  const hrefToLinkPage = `${APP_DOMAIN}/links/${link.domain}/${link.key}`;

  const quickLinks = [
    `<${hrefToCustomerPage}|Customer>`,
    `<${hrefToLinkPage}|Link>`,
  ];

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
            text: `*Customer*\n${customer.name} (<mailto:${customer.email}|${customer.email}>)`,
          },
          {
            type: "mrkdwn",
            text: `*Country*\n:flag-${click.country.toLowerCase()}: ${COUNTRIES[click.country]}`,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Amount*\n${amountInDollars} ${sale.currency.toUpperCase()}`,
          },
          {
            type: "mrkdwn",
            text: `*Sale Type*\n${isNewSaleType ? ":new: New sale (first payment)" : ":repeat: Recurring sale (subscription renewal)"}`,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Link*\n<${hrefToLinkPage}|${link.domain}/${link.key}>`,
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `View on Dub: ${quickLinks.join(" | ")}`,
          },
        ],
      },
    ],
  };
};

const slackTemplates: Record<WebhookTrigger, any> = {
  "link.created": linkTemplates,
  "link.updated": linkTemplates,
  "link.deleted": linkTemplates,
  "link.clicked": linkClickedTemplate,
  "lead.created": leadCreatedTemplate,
  "sale.created": saleCreatedTemplate,
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
