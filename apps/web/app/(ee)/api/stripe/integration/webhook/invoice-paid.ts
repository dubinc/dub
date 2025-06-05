import { convertCurrency } from "@/lib/analytics/convert-currency";
import { includeTags } from "@/lib/api/links/include-tags";
import { notifyPartnerSale } from "@/lib/api/partners/notify-partner-sale";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { getConnectedCustomer } from "./utils";

// Handle event "invoice.paid"
export async function invoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const stripeAccountId = event.account as string;
  const stripeCustomerId = invoice.customer as string;
  const invoiceId = invoice.id;

  // Find customer using stripeCustomerId
  let customer = await prisma.customer.findUnique({
    where: {
      stripeCustomerId,
    },
  });

  // if customer is not found, we check if the connected customer has a dubCustomerId
  if (!customer) {
    const connectedCustomer = await getConnectedCustomer({
      stripeCustomerId,
      stripeAccountId,
      livemode: event.livemode,
    });

    const dubCustomerId = connectedCustomer?.metadata.dubCustomerId;

    if (dubCustomerId) {
      try {
        // Update customer with stripeCustomerId if exists – for future events
        customer = await prisma.customer.update({
          where: {
            projectConnectId_externalId: {
              projectConnectId: stripeAccountId,
              externalId: dubCustomerId,
            },
          },
          data: {
            stripeCustomerId,
          },
        });
      } catch (error) {
        console.log(error);
        return `Customer with dubCustomerId ${dubCustomerId} not found, skipping...`;
      }
    }
  }

  // if customer is still not found, we skip the event
  if (!customer) {
    return `Customer with stripeCustomerId ${stripeCustomerId} not found on Dub (nor does the connected customer ${stripeCustomerId} have a valid dubCustomerId), skipping...`;
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

  // if the invoice has no subscription, it's a one-time payment
  const isOneTimePayment = invoice.lines.data.some(
    (line) => line.parent?.subscription_item_details === null,
  );

  const saleData = {
    ...leadEvent.data[0],
    event_id: eventId,
    event_name: isOneTimePayment ? "Purchase" : "Invoice paid",
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
          increment: invoice.amount_paid,
        },
      },
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
      currency: saleData.currency,
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
