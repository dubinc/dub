import { convertCurrency } from "@/lib/analytics/convert-currency";
import { DubApiError } from "@/lib/api/errors";
import { includeTags } from "@/lib/api/links/include-tags";
import { notifyPartnerSale } from "@/lib/api/partners/notify-partner-sale";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { logConversionEvent } from "@/lib/tinybird/log-conversion-events";
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
import { NextResponse } from "next/server";
import { z } from "zod";

type LeadEvent = z.infer<typeof leadEventSchemaTB>;

// POST /api/track/sale – Track a sale conversion event
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const body = await parseRequestBody(req);

    let {
      customerExternalId: newExternalId,
      externalId: oldExternalId, // deprecated
      customerId: oldCustomerId, // deprecated
      paymentProcessor,
      invoiceId,
      amount,
      currency,
      metadata,
      eventName,
      leadEventName,
    } = trackSaleRequestSchema
      .extend({
        // add backwards compatibility
        customerExternalId: z.string().nullish(),
        externalId: z.string().nullish(),
        customerId: z.string().nullish(),
      })
      .parse(body);

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

    const customerExternalId = newExternalId || oldExternalId || oldCustomerId;

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
      waitUntil(
        logConversionEvent({
          workspace_id: workspace.id,
          path: "/track/sale",
          body: JSON.stringify(body),
          error: `Customer not found for externalId: ${customerExternalId}`,
        }),
      );

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
      // if leadEventName is provided, we only check for that specific event
      // otherwise, we check for all cached lead events for that customer

      const cachedLeadEvent = await redis.get<LeadEvent>(
        `leadCache:${customer.id}${leadEventName ? `:${leadEventName.toLowerCase().replace(" ", "-")}` : ""}`,
      );

      if (!cachedLeadEvent) {
        throw new DubApiError({
          code: "not_found",
          message: `Lead event not found for externalId: ${customerExternalId} and eventName: ${leadEventName}`,
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
        const [_sale, link] = await Promise.all([
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
            },
          }),
          // update customer sales count
          prisma.customer.update({
            where: {
              id: customer.id,
            },
            data: {
              sales: {
                increment: 1,
              },
              saleAmount: {
                increment: amount,
              },
            },
          }),

          logConversionEvent({
            workspace_id: workspace.id,
            link_id: clickData.link_id,
            path: "/track/sale",
            body: JSON.stringify(body),
          }),
        ]);

        // for program links
        if (link.programId && link.partnerId) {
          const commission = await createPartnerCommission({
            event: "sale",
            programId: link.programId,
            partnerId: link.partnerId,
            linkId: link.id,
            eventId,
            customerId: customer.id,
            amount: saleData.amount,
            quantity: 1,
            invoiceId,
            currency,
          });

          if (commission) {
            waitUntil(
              notifyPartnerSale({
                link,
                commission,
              }),
            );
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
