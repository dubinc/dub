import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { getBountyRewardDescription } from "@/lib/partners/get-bounty-reward-description";
import { APP_DOMAIN, COUNTRIES, currencyFormatter, truncate } from "@dub/utils";
import { LinkWebhookEvent } from "dub/models/components";
import * as z from "zod/v4";
import { WebhookTrigger } from "../../types";
import { webhookPayloadSchema } from "../../webhook/schemas";
import {
  BountyEventWebhookPayload,
  ClickEventWebhookPayload,
  CommissionEventWebhookPayload,
  LeadEventWebhookPayload,
  PartnerApplicationWebhookPayload,
  PartnerEventWebhookPayload,
  PayoutEventWebhookPayload,
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
  const { customer, click, link, partner } = data;
  const hrefToCustomerPage = `${APP_DOMAIN}/customers/${customer.id}`;
  const hrefToPartnerPage = `${APP_DOMAIN}/program/partners/${partner?.id}`;
  const hrefToLinkPage = `${APP_DOMAIN}/links/${link.domain}/${link.key}`;

  const quickLinks = [
    `<${hrefToCustomerPage}|Customer>`,
    ...(partner ? [`<${hrefToPartnerPage}|Partner>`] : []),
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
          ...(partner
            ? [
                {
                  type: "mrkdwn",
                  text: `*Partner*\n<${hrefToPartnerPage}|${partner.name}> (<${hrefToPartnerPage}|\`${partner.email}\`>)`,
                },
              ]
            : []),
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
  const { customer, click, sale, link, partner } = data;
  const amountInDollars = (sale.amount / 100).toFixed(2);
  const isNewSaleType = isFirstConversion({
    customer: {
      sales: customer.sales || 0,
      linkId: null,
    },
  });
  const hrefToCustomerPage = `${APP_DOMAIN}/customers/${customer.id}`;
  const hrefToPartnerPage = `${APP_DOMAIN}/program/partners/${partner?.id}`;
  const hrefToLinkPage = `${APP_DOMAIN}/links/${link.domain}/${link.key}`;

  const quickLinks = [
    `<${hrefToCustomerPage}|Customer>`,
    ...(partner ? [`<${hrefToPartnerPage}|Partner>`] : []),
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
          ...(partner
            ? [
                {
                  type: "mrkdwn",
                  text: `*Partner*\n<${hrefToPartnerPage}|${partner.name}> (<${hrefToPartnerPage}|\`${partner.email}\`>)`,
                },
              ]
            : []),
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

const partnerEnrolledTemplate = ({
  data,
}: {
  data: PartnerEventWebhookPayload;
}) => {
  const { name, email, country, companyName, partnerId } = data;
  const hrefToPartnerPage = `${APP_DOMAIN}/program/partners/${partnerId}`;

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
            text: `*Partner*\n<${hrefToPartnerPage}|${name}> (<${hrefToPartnerPage}|\`${email}\`>)`,
          },
          ...(country
            ? [
                {
                  type: "mrkdwn",
                  text: `*Country*\n:flag-${country.toLowerCase()}: ${COUNTRIES[country]}`,
                },
              ]
            : []),
          ...(companyName
            ? [
                {
                  type: "mrkdwn",
                  text: `*Company*\n${companyName}`,
                },
              ]
            : []),
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `View on Dub: <${hrefToPartnerPage}|Partner>`,
          },
        ],
      },
    ],
  };
};

const partnerApplicationSubmittedTemplate = ({
  data,
}: {
  data: PartnerApplicationWebhookPayload;
}) => {
  const { partner } = data;
  const hrefToApplicationPage = `${APP_DOMAIN}/program/partners/applications?partnerId=${partner.id}`;

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New partner application submitted* :incoming_envelope:`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Name*\n<${hrefToApplicationPage}|${partner.name}> (<${hrefToApplicationPage}|\`${partner.email}\`>)`,
          },
          ...(partner.country
            ? [
                {
                  type: "mrkdwn",
                  text: `*Country*\n:flag-${partner.country.toLowerCase()}: ${COUNTRIES[partner.country]}`,
                },
              ]
            : []),
          ...(partner.companyName
            ? [
                {
                  type: "mrkdwn",
                  text: `*Company*\n${partner.companyName}`,
                },
              ]
            : []),
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `View on Dub: <${hrefToApplicationPage}|Application>`,
          },
        ],
      },
    ],
  };
};

const commissionCreatedTemplate = ({
  data,
}: {
  data: CommissionEventWebhookPayload;
}) => {
  const { id, amount, earnings, currency, partner, customer, link } = data;

  const formattedAmount = currencyFormatter(amount, { currency });
  const formattedEarnings = currencyFormatter(earnings, { currency });
  const hrefToPartnerPage = `${APP_DOMAIN}/program/partners/${partner.id}`;
  const hrefToCustomerPage = customer
    ? `${APP_DOMAIN}/customers/${customer.id}`
    : null;
  const hrefToLinkPage = link
    ? `${APP_DOMAIN}/links/${link.domain}/${link.key}`
    : null;
  const hrefToCommission = `${APP_DOMAIN}/program/commissions?commissionId=${id}`;

  const quickLinks = [
    `<${hrefToCommission}|Commission>`,
    `<${hrefToPartnerPage}|Partner>`,
    ...(customer ? [`<${hrefToCustomerPage}|Customer>`] : []),
    ...(link ? [`<${hrefToLinkPage}|Link>`] : []),
  ];

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*New commission created* :tada:",
        },
        fields: [
          {
            type: "mrkdwn",
            text: `*Partner*\n<${hrefToPartnerPage}|${partner.name}> (<${hrefToPartnerPage}|\`${partner.email}\`>)`,
          },
          ...(customer
            ? [
                {
                  type: "mrkdwn",
                  text: `*Customer*\n<${hrefToCustomerPage}|${customer.name}> (<${hrefToCustomerPage}|\`${customer.email}\`>)`,
                },
              ]
            : []),
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Commission Amount*\n${formattedAmount}`,
          },
          {
            type: "mrkdwn",
            text: `*Partner Earnings*\n${formattedEarnings}`,
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

const bountyTemplates = ({
  data,
  event,
}: {
  data: BountyEventWebhookPayload;
  event: WebhookTrigger;
}) => {
  const {
    id,
    name,
    description,
    rewardAmount,
    rewardDescription,
    type,
    startsAt,
    endsAt,
  } = data;

  const eventMessages = {
    "bounty.created": "*New bounty created* :money_with_wings:",
    "bounty.updated": "*Bounty updated* :memo:",
  };

  const formattedReward = getBountyRewardDescription({
    rewardAmount,
    rewardDescription,
  });

  const hrefToBounty = `${APP_DOMAIN}/program/bounties/${id}`;

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
            text: `*Bounty Name*\n${truncate(name, 140) || "Untitled Bounty"}`,
          },
          {
            type: "mrkdwn",
            text: `*Reward*\n${formattedReward}`,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Type*\n${type.charAt(0).toUpperCase() + type.slice(1)}`,
          },
          {
            type: "mrkdwn",
            text: `*Duration*\n${new Date(startsAt).toLocaleDateString()}${endsAt ? ` - ${new Date(endsAt).toLocaleDateString()}` : " (No end date)"}`,
          },
        ],
      },
      ...(description
        ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Description*\n${truncate(description, 140)}`,
              },
            },
          ]
        : []),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `<${hrefToBounty}|View on Dub>`,
          },
        ],
      },
    ],
  };
};

const payoutConfirmedTemplate = ({
  data,
}: {
  data: PayoutEventWebhookPayload;
}) => {
  const { id, amount, currency, partner, invoiceId } = data;
  const formattedAmount = currencyFormatter(amount, { currency });
  const hrefToPayout = `${APP_DOMAIN}/program/payouts?payoutId=${id}`;

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Payout confirmed* :money_with_wings:`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Partner*\n${partner.name}`,
          },
          {
            type: "mrkdwn",
            text: `*Email*\n<mailto:${partner.email}|${partner.email}>`,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Amount*\n${formattedAmount}`,
          },
          ...(invoiceId
            ? [
                {
                  type: "mrkdwn",
                  text: `*Invoice ID*\n${invoiceId}`,
                },
              ]
            : []),
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Payout ID: ${id} | <${hrefToPayout}|View on Dub>`,
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
  "partner.enrolled": partnerEnrolledTemplate,
  "partner.application_submitted": partnerApplicationSubmittedTemplate,
  "commission.created": commissionCreatedTemplate,
  "bounty.created": bountyTemplates,
  "bounty.updated": bountyTemplates,
  "payout.confirmed": payoutConfirmedTemplate,
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
  const isBountyEvent = ["bounty.created", "bounty.updated"].includes(event);

  return template({
    data,
    ...((isLinkEvent || isBountyEvent) && { event }),
  });
};
