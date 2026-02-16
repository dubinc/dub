import { PostbackTrigger } from "@/lib/types";
import { PartnerPostback } from "@dub/prisma/client";
import { COUNTRIES, currencyFormatter, PARTNERS_DOMAIN } from "@dub/utils";
import type { z } from "zod/v4";
import {
  commissionEventPostbackSchema,
  leadEventPostbackSchema,
  saleEventPostbackSchema,
} from "../schemas";
import { PostbackAdapter } from "./postback-adapters";

type LeadEventPostback = z.infer<typeof leadEventPostbackSchema>;
type SaleEventPostback = z.infer<typeof saleEventPostbackSchema>;
type CommissionEventPostback = z.infer<typeof commissionEventPostbackSchema>;

interface PostbackPayload<T extends Record<string, unknown>> {
  eventId: string;
  event: PostbackTrigger;
  createdAt: string;
  data: T;
}

export class PostbackSlackAdapter extends PostbackAdapter {
  constructor(postback: PartnerPostback) {
    super(postback);
  }

  protected registerEventTransformers() {
    this.eventTransformers.register("lead.created", {
      transform: ({ data }: PostbackPayload<LeadEventPostback>) => {
        const { link, click, customer } = data;

        const hrefToLinkPage = `${PARTNERS_DOMAIN}/links/${link.domain}/${link.key}`;
        const countryLabel = COUNTRIES[click.country]
          ? `:flag-${click.country.toLowerCase()}: ${COUNTRIES[click.country]}`
          : click.country;

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
                  text: `*Customer ID*\n\`${customer.id}\``,
                },
                {
                  type: "mrkdwn",
                  text: `*Country*\n${countryLabel}`,
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
                  text: `*Link*\n<${hrefToLinkPage}|${link.domain}/${link.key}>`,
                },
              ],
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `<${hrefToLinkPage}|View on Dub Partners>`,
                },
              ],
            },
          ],
        };
      },
    });

    this.eventTransformers.register("sale.created", {
      transform: ({ data }: PostbackPayload<SaleEventPostback>) => {
        const { link, click, customer, sale } = data;

        const hrefToLinkPage = `${PARTNERS_DOMAIN}/links/${link.domain}/${link.key}`;
        const countryLabel = COUNTRIES[click.country]
          ? `:flag-${click.country.toLowerCase()}: ${COUNTRIES[click.country]}`
          : click.country;
        const formattedAmount = currencyFormatter(sale.amount, {
          currency: sale.currency,
        });

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
                  text: `*Customer ID*\n\`${customer.id}\``,
                },
                {
                  type: "mrkdwn",
                  text: `*Country*\n${countryLabel}`,
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
                {
                  type: "mrkdwn",
                  text: `*Short link*\n<${link.shortLink}|${link.shortLink}>`,
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
                  text: `<${hrefToLinkPage}|View on Dub Partners>`,
                },
              ],
            },
          ],
        };
      },
    });

    this.eventTransformers.register("commission.created", {
      transform: ({ data }: PostbackPayload<CommissionEventPostback>) => {
        const { id, amount, earnings, currency, description, link, customer } =
          data;

        const formattedAmount = currencyFormatter(amount, { currency });
        const formattedEarnings = currencyFormatter(earnings, { currency });
        const hrefToCommission = `${PARTNERS_DOMAIN}/commissions?commissionId=${id}`;

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
                  text: `*Commission amount*\n${formattedAmount}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Partner earnings*\n${formattedEarnings}`,
                },
                ...(description
                  ? [
                      {
                        type: "mrkdwn" as const,
                        text: `*Description*\n${description}`,
                      },
                    ]
                  : []),
              ],
            },
            ...(link
              ? [
                  {
                    type: "section" as const,
                    fields: [
                      {
                        type: "mrkdwn" as const,
                        text: `*Link*\n<${PARTNERS_DOMAIN}/links/${link.domain}/${link.key}|${link.domain}/${link.key}>`,
                      },
                    ],
                  },
                ]
              : []),
            ...(customer
              ? [
                  {
                    type: "section" as const,
                    fields: [
                      {
                        type: "mrkdwn" as const,
                        text: `*Customer ID*\n\`${customer.id}\``,
                      },
                    ],
                  },
                ]
              : []),
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `<${hrefToCommission}|View on Dub Partners>`,
                },
              ],
            },
          ],
        };
      },
    });
  }
}
