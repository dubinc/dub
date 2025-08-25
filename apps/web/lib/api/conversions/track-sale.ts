import { convertCurrency } from "@/lib/analytics/convert-currency";
import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { DubApiError } from "@/lib/api/errors";
import { includeTags } from "@/lib/api/links/include-tags";
import { notifyPartnerSale } from "@/lib/api/partners/notify-partner-sale";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { logConversionEvent } from "@/lib/tinybird/log-conversion-events";
import { LeadEventTB, WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import {
  trackSaleRequestSchema,
  trackSaleResponseSchema,
} from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { WorkflowTrigger } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { executeWorkflows } from "../workflows/execute-workflows";

type TrackSaleParams = z.input<typeof trackSaleRequestSchema> & {
  rawBody: any;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
};

export const trackSale = async ({
  customerExternalId,
  amount,
  currency = "usd",
  eventName,
  paymentProcessor,
  invoiceId,
  leadEventName,
  metadata,
  rawBody,
  workspace,
}: TrackSaleParams) => {
  if (invoiceId) {
    // Skip if invoice id is already processed
    const ok = await redis.set(`dub_sale_events:invoiceId:${invoiceId}`, 1, {
      ex: 60 * 60 * 24 * 7,
      nx: true,
    });

    if (!ok) {
      return {
        eventName,
        customer: null,
        sale: null,
      };
    }
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
        body: JSON.stringify(rawBody),
        error: `Customer not found for externalId: ${customerExternalId}`,
      }),
    );

    return {
      eventName,
      customer: null,
      sale: null,
    };
  }

  // Find lead event
  const leadEvent = await getLeadEvent({
    customerId: customer.id,
    eventName: leadEventName,
  });

  let leadEventData: LeadEventTB | null = null;

  if (!leadEvent || leadEvent.data.length === 0) {
    // Check cache to see if the lead event exists
    // if leadEventName is provided, we only check for that specific event
    // otherwise, we check for all cached lead events for that customer

    const cachedLeadEvent = await redis.get<LeadEventTB>(
      `leadCache:${customer.id}${leadEventName ? `:${leadEventName.toLowerCase().replaceAll(" ", "-")}` : ""}`,
    );

    if (!cachedLeadEvent) {
      const errorMessage = `Lead event not found for externalId: ${customerExternalId} and leadEventName: ${leadEventName}`;

      waitUntil(
        logConversionEvent({
          workspace_id: workspace.id,
          path: "/track/sale",
          body: JSON.stringify(rawBody),
          error: errorMessage,
        }),
      );

      throw new DubApiError({
        code: "not_found",
        message: errorMessage,
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
      await convertCurrency({
        currency,
        amount,
      });

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

        // update link conversions, sales, and saleAmount
        prisma.link.update({
          where: {
            id: clickData.link_id,
          },
          data: {
            ...(isFirstConversion({
              customer,
              linkId: clickData.link_id,
            }) && {
              conversions: {
                increment: 1,
              },
            }),
            sales: {
              increment: 1,
            },
            saleAmount: {
              increment: amount,
            },
          },
          include: includeTags,
        }),

        // update workspace events usage
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
          body: JSON.stringify(rawBody),
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
          context: {
            customer: {
              country: customer.country,
            },
            sale: {
              productId: metadata?.productId as string,
            },
          },
        });

        if (commission) {
          await notifyPartnerSale({
            link,
            commission,
          });
        }

        await executeWorkflows({
          trigger: WorkflowTrigger.saleRecorded,
          programId: link.programId,
          partnerId: link.partnerId,
        });
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

  return {
    ...sale,
    // for backwards compatibility – will remove soon
    amount,
    currency,
    invoiceId,
    paymentProcessor,
    metadata,
  };
};
