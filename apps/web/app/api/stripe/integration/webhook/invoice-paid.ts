import { convertCurrency } from "@/lib/analytics/convert-currency";
import { createId } from "@/lib/api/create-id";
import { includeTags } from "@/lib/api/links/include-tags";
import { notifyPartnerSale } from "@/lib/api/partners/notify-partner-sale";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { differenceInMonths } from "date-fns";
import type Stripe from "stripe";

// Handle event "invoice.paid"
export async function invoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const stripeCustomerId = invoice.customer as string;
  const invoiceId = invoice.id;

  // Find customer using projectConnectId and stripeCustomerId
  const customer = await prisma.customer.findUnique({
    where: {
      stripeCustomerId,
    },
  });

  if (!customer) {
    return `Customer with stripeCustomerId ${stripeCustomerId} not found, skipping...`;
  }

  // Skip if invoice id is already processed
  const ok = await redis.set(`dub_sale_events:invoiceId:${invoiceId}`, 1, {
    ex: 60 * 60 * 24 * 7,
    nx: true,
  });

  if (!ok) {
    console.info(
      "[Stripe Webhook] Skipping already processed invoice.",
      invoiceId,
    );
    return `Invoice with ID ${invoiceId} already processed, skipping...`;
  }

  if (invoice.amount_paid === 0) {
    return `Invoice with ID ${invoiceId} has an amount of 0, skipping...`;
  }

  // if currency is not USD, convert it to USD  based on the current FX rate
  // TODO: allow custom "defaultCurrency" on workspace table in the future
  if (invoice.currency && invoice.currency !== "usd") {
    const { currency: convertedCurrency, amount: convertedAmount } =
      await convertCurrency({
        currency: invoice.currency,
        amount: invoice.amount_paid,
      });

    invoice.currency = convertedCurrency;
    invoice.amount_paid = convertedAmount;
  }

  // Find lead
  const leadEvent = await getLeadEvent({ customerId: customer.id });
  if (!leadEvent || leadEvent.data.length === 0) {
    return `Lead event with customer ID ${customer.id} not found, skipping...`;
  }

  const eventId = nanoid(16);

  const saleData = {
    ...leadEvent.data[0],
    event_id: eventId,
    // if the invoice has no subscription, it's a one-time payment
    event_name: !invoice.subscription ? "Purchase" : "Invoice paid",
    payment_processor: "stripe",
    amount: invoice.amount_paid,
    currency: invoice.currency,
    invoice_id: invoiceId,
    metadata: JSON.stringify({
      invoice,
    }),
  };

  const linkId = leadEvent.data[0].link_id;
  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  if (!link) {
    return `Link with ID ${linkId} not found, skipping...`;
  }

  const [_sale, linkUpdated, workspace] = await Promise.all([
    recordSale(saleData),

    // update link sales count
    prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: invoice.amount_paid,
        },
      },
      include: includeTags,
    }),
    // update workspace sales usage
    prisma.project.update({
      where: {
        id: customer.projectId,
      },
      data: {
        usage: {
          increment: 1,
        },
        salesUsage: {
          increment: invoice.amount_paid,
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

  // send workspace webhook
  waitUntil(
    sendWorkspaceWebhook({
      trigger: "sale.created",
      workspace,
      data: transformSaleEventData({
        ...saleData,
        clickedAt: customer.clickedAt || customer.createdAt,
        link: linkUpdated,
        customer,
      }),
    }),
  );

  return `Sale recorded for customer ID ${customer.id} and invoice ID ${invoiceId}`;
}
