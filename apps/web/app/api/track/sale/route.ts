import { DubApiError } from "@/lib/api/errors";
import { includeTags } from "@/lib/api/links/include-tags";
import { notifyPartnerSale } from "@/lib/api/partners/notify-partner-sale";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { createId, parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhookOnEdge } from "@/lib/webhook/publish-edge";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import {
  trackSaleRequestSchema,
  trackSaleResponseSchema,
} from "@/lib/zod/schemas/sales";
import { prismaEdge } from "@dub/prisma/edge";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { determinePartnerReward } from "../determine-partner-reward-edge";

export const runtime = "edge";

// POST /api/track/sale – Track a sale conversion event
export const POST = withWorkspaceEdge(
  async ({ req, workspace }) => {
    const {
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
    const customer = await prismaEdge.customer.findUnique({
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

    if (!leadEvent || leadEvent.data.length === 0) {
      throw new DubApiError({
        code: "not_found",
        message: `Lead event not found for externalId: ${customerExternalId}`,
      });
    }

    const clickData = clickEventSchemaTB
      .omit({ timestamp: true })
      .parse(leadEvent.data[0]);

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
          prismaEdge.link.update({
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
          prismaEdge.project.update({
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

            if (reward.maxDuration === 0) {
              const commissionCount = await prismaEdge.commission.count({
                where: {
                  type: "sale",
                  customerId: customer.id,
                },
              });

              if (commissionCount > 0) {
                eligibleForCommission = false;
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

              await prismaEdge.commission.create({
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

              const program = await prismaEdge.program.findUniqueOrThrow({
                where: {
                  id: link.programId!,
                },
                select: {
                  id: true,
                  name: true,
                  logo: true,
                },
              });

              await notifyPartnerSale({
                program,
                partner: {
                  id: link.partnerId!,
                  referralLink: link.shortLink,
                },
                sale: {
                  amount: saleData.amount,
                  earnings,
                },
              });
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

        await sendWorkspaceWebhookOnEdge({
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
      "enterprise",
    ],
  },
);
