import { convertCurrency } from "@/lib/analytics/convert-currency";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { includeTags } from "@/lib/api/links/include-tags";
import { notifyPartnerSale } from "@/lib/api/partners/notify-partner-sale";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import {
  trackSaleRequestSchema,
  trackSaleResponseSchema,
} from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { differenceInMonths } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

type LeadEvent = z.infer<typeof leadEventSchemaTB>;

// POST /api/track/sale – Track a sale conversion event
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    let {
      externalId,
      customerId, // deprecated
      paymentProcessor,
      invoiceId,
      amount,
      currency,
      metadata,
      eventName,
      leadEventName,
    } = trackSaleRequestSchema.parse(await parseRequestBody(req));

    if (invoiceId) {
      // Skip if invoice id is already processed
      const ok = await redis.set(`dub_sale_events:invoiceId:${invoiceId}`, 1, {
        ex: 60 * 60 * 24 * 7,
        nx: true,
      });

      if (!ok) {
        return NextResponse.json({
          eventName,
          customer: null,
          sale: null,
        });
      }
    }

    const customerExternalId = customerId || externalId;

    if (!customerExternalId) {
      throw new DubApiError({
        code: "bad_request",
        message: "externalId is required",
      });
    }

    // Find customer
    const customer = await prisma.customer.findUnique({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId: customerExternalId,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({
        eventName,
        customer: null,
        sale: null,
      });
    }

    // Find lead event
    const leadEvent = await getLeadEvent({
      customerId: customer.id,
      eventName: leadEventName,
    });

    let leadEventData: LeadEvent | null = null;

    if (!leadEvent || leadEvent.data.length === 0) {
      // Check cache to see if the lead event exists
      const cachedLeadEvent = await redis.get<LeadEvent>(
        `latestLeadEvent:${customer.id}`,
      );

      if (!cachedLeadEvent) {
        throw new DubApiError({
          code: "not_found",
          message: `Lead event not found for externalId: ${customerExternalId}`,
        });
      }

      leadEventData = cachedLeadEvent;
    } else {
      leadEventData = leadEvent.data[0];
    }

    const clickData = clickEventSchemaTB
      .omit({ timestamp: true })
      .parse(leadEventData);

    // if currency is not USD, convert it to USD  based on the current FX rate
    // TODO: allow custom "defaultCurrency" on workspace table in the future
    if (currency !== "usd") {
      const { currency: convertedCurrency, amount: convertedAmount } =
        await convertCurrency({ currency, amount });

      currency = convertedCurrency;
      amount = convertedAmount;
    }

    const eventId = nanoid(16);

    const saleData = {
      ...clickData,
      event_id: eventId,
      event_name: eventName,
      customer_id: customer.id,
      payment_processor: paymentProcessor,
      amount,
      currency,
      invoice_id: invoiceId || "",
      metadata: metadata ? JSON.stringify(metadata) : "",
    };

    waitUntil(
      (async () => {
        const [_sale, link, _project] = await Promise.all([
          recordSale(saleData),

          // update link sales count
          prisma.link.update({
            where: {
              id: clickData.link_id,
            },
            data: {
              sales: {
                increment: 1,
              },
              saleAmount: {
                increment: amount,
              },
            },
            include: includeTags,
          }),
          // update workspace sales usage
          prisma.project.update({
            where: {
              id: workspace.id,
            },
            data: {
              usage: {
                increment: 1,
              },
              salesUsage: {
                increment: amount,
              },
            },
          }),
        ]);

        // for program links
        if (link.programId && link.partnerId) {
          const reward = await determinePartnerReward({
            programId: link.programId,
            partnerId: link.partnerId,
            event: "sale",
          });

          if (reward) {
            let eligibleForCommission = true;

            if (typeof reward.maxDuration === "number") {
              // Get the first commission (earliest sale) for this customer-partner pair
              const firstCommission = await prisma.commission.findFirst({
                where: {
                  partnerId: link.partnerId,
                  customerId: customer.id,
                  type: "sale",
                },
                orderBy: {
                  createdAt: "asc",
                },
              });

              if (firstCommission) {
                if (reward.maxDuration === 0) {
                  eligibleForCommission = false;
                } else {
                  // Calculate months difference between first commission and now
                  const monthsDifference = differenceInMonths(
                    new Date(),
                    firstCommission.createdAt,
                  );

                  if (monthsDifference >= reward.maxDuration) {
                    eligibleForCommission = false;
                  }
                }
              }
            }

            if (eligibleForCommission) {
              const earnings = calculateSaleEarnings({
                reward,
                sale: {
                  quantity: 1,
                  amount: saleData.amount,
                },
              });

              const commission = await prisma.commission.create({
                data: {
                  id: createId({ prefix: "cm_" }),
                  programId: link.programId,
                  linkId: link.id,
                  partnerId: link.partnerId,
                  eventId,
                  customerId: customer.id,
                  quantity: 1,
                  type: "sale",
                  amount: saleData.amount,
                  earnings,
                  invoiceId,
                },
              });

              waitUntil(
                notifyPartnerSale({
                  link,
                  commission,
                }),
              );
            }
          }
        }

        // Send workspace webhook
        const sale = transformSaleEventData({
          ...saleData,
          clickedAt: customer.clickedAt || customer.createdAt,
          link,
          customer,
        });

        await sendWorkspaceWebhook({
          trigger: "sale.created",
          data: sale,
          workspace,
        });
      })(),
    );

    const sale = trackSaleResponseSchema.parse({
      eventName,
      customer,
      sale: {
        amount,
        currency,
        invoiceId,
        paymentProcessor,
        metadata,
      },
    });

    return NextResponse.json({
      ...sale,
      // for backwards compatibility – will remove soon
      amount,
      currency,
      invoiceId,
      paymentProcessor,
      metadata,
    });
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
