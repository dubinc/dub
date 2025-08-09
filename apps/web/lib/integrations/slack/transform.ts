import { APP_DOMAIN, currencyFormatter, formatDateTime } from "@dub/utils";
import { prisma } from "@dub/prisma";
import { LinkWebhookEvent } from "dub/models/components";
import { z } from "zod";
import { WebhookTrigger } from "../../types";
import { webhookPayloadSchema } from "../../webhook/schemas";
import {
  ClickEventWebhookPayload,
  CommissionEventWebhookPayload,
  LeadEventWebhookPayload,
  PartnerEventWebhookPayload,
  SaleEventWebhookPayload,
} from "../../webhook/types";

const createLinkTemplate = async ({
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

  // Fetch user and workspace information if provided
  let userInfo: { name: string; email: string } | null = null;
  let workspaceSlug: string | null = null;

  try {
    // Fetch user information if userId is provided
    if (data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { name: true, email: true },
      });
      userInfo = user;
    }

    // Fetch workspace information for the "View on Dub" link
    const workspace = await prisma.project.findUnique({
      where: { id: data.workspaceId },
      select: { slug: true },
    });
    workspaceSlug = workspace?.slug || null;
  } catch (error) {
    console.warn(`Failed to fetch user/workspace info`, error);
  }

  // Format the creation time
  const formattedTime = formatDateTime(data.createdAt);
  
  // Generate user display name with fallback
  const userDisplayName = userInfo?.name || userInfo?.email || 'Anonymous User';

  const blocks = [
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
  ];

  // Add context section with user and time information
  const viewOnDubLink = workspaceSlug 
    ? `<${APP_DOMAIN}/${workspaceSlug}|View on Dub>`
    : `<${APP_DOMAIN}|View on Dub>`;
    
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `*Created by* ${userDisplayName} | ${formattedTime} | ${viewOnDubLink}`,
      },
    ],
  });

  return { blocks };
};

const clickLinkTemplate = ({ data }: { data: ClickEventWebhookPayload }) => {
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

const createLeadTemplate = ({ data }: { data: LeadEventWebhookPayload }) => {
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

const createSaleTemplate = ({ data }: { data: SaleEventWebhookPayload }) => {
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

const enrolledPartnerTemplate = ({
  data,
}: {
  data: PartnerEventWebhookPayload;
}) => {
  const { name, email, country } = data;

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New partner enrolled* :tada:`,
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

// TODO (kiran):
// We should improve this template
const commissionCreatedTemplate = ({
  data,
}: {
  data: CommissionEventWebhookPayload;
}) => {
  const { id, amount, earnings } = data;

  const formattedAmount = currencyFormatter(amount / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedEarnings = currencyFormatter(earnings / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New commission created* :tada:`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Commission ID*\n${id}`,
          },
          {
            type: "mrkdwn",
            text: `*Amount*\n${formattedAmount}`,
          },
          {
            type: "mrkdwn",
            text: `*Earnings*\n${formattedEarnings}`,
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
  "partner.enrolled": enrolledPartnerTemplate,
  "commission.created": commissionCreatedTemplate,
};

export const formatEventForSlack = async (
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

  return await template({
    data,
    ...(isLinkEvent && { event }),
  });
};
