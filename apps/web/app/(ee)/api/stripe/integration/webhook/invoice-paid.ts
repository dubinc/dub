import { convertCurrency } from "@/lib/analytics/convert-currency";
import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { includeTags } from "@/lib/api/links/include-tags";
import { queueGoogleAdsConversionUpload } from "@/lib/integrations/google-ads/upload-conversion";
import { prisma } from "@/lib/prisma";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { WebhookHandlerInput, WebhookHandlerResponse } from "./types";
import { getConnectedCustomer } from "./utils/get-connected-customer";
import { getDubCustomerExternalIdFromMetadata } from "./utils/get-dub-customer-external-id-from-metadata";
import { updateCustomerWithStripeCustomerId } from "./utils/update-customer-with-stripe-customer-id";

// Handle event "invoice.paid"
export async function invoicePaid({
  event,
  mode,
  workspace,
}: WebhookHandlerInput<Stripe.InvoicePaidEvent>): Promise<WebhookHandlerResponse> {
  const invoice = event.data.object;
  const stripeCustomerId = invoice.customer as string | null;
  const stripeAccountId = workspace.stripeConnectId!;
  const invoiceId = invoice.id;

  if (!invoiceId) {
    return {
      response: "Invoice ID not found, skipping...",
    };
  }

  if (!stripeCustomerId) {
    return {
      response: "Stripe customer ID not found on invoice, skipping...",
    };
  }

  // Find customer using stripeCustomerId
  let customer = await prisma.customer.findUnique({
    where: {
      stripeCustomerId,
    },
  });

  // if customer is not found, we check if the connected customer has a dubCustomerExternalId
  if (!customer) {
    const connectedCustomer = await getConnectedCustomer({
      stripeCustomerId,
      stripeAccountId,
      mode,
    });

    const dubCustomerExternalId = getDubCustomerExternalIdFromMetadata(
      connectedCustomer?.metadata,
    );

    if (dubCustomerExternalId) {
      customer = await updateCustomerWithStripeCustomerId({
        workspaceId: workspace.id,
        dubCustomerExternalId,
        stripeCustomerId,
      });
    }
  }

  if (!customer) {
    return {
      response: `Customer with stripeCustomerId ${stripeCustomerId} not found on Dub (nor does the connected customer ${stripeCustomerId} have a valid dubCustomerExternalId), skipping...`,
    };
  }

  // Sale amount excluding tax: use total_excluding_tax only when invoice was paid in full
  // (amount_paid === total); otherwise use amount_paid (e.g. credits applied, upsells, etc.).
  let invoiceSaleAmount =
    invoice.amount_paid === invoice.total && invoice.total_excluding_tax != null
      ? invoice.total_excluding_tax
      : invoice.amount_paid;

  // Skip if invoice id is already processed
  const ok = await redis.set(
    `trackSale:stripe:invoiceId:${invoiceId}`, // here we assume that Stripe's invoice ID is unique across all customers
    {
      timestamp: new Date().toISOString(),
      dubCustomerExternalId: customer.externalId,
      stripeCustomerId,
      stripeAccountId,
      invoiceId,
      customerId: customer.id,
      workspaceId: customer.projectId,
      amount: invoiceSaleAmount,
      currency: invoice.currency,
    },
    {
      ex: 60 * 60 * 24 * 7,
      nx: true,
    },
  );

  if (!ok) {
    console.info(
      "[invoice.paid] Skipping already processed invoice.",
      invoiceId,
    );
    return {
      response: `Invoice with ID ${invoiceId} already processed, skipping...`,
    };
  }

  // Stripe can sometimes return a negative amount for some reason, so we skip if it's below 0
  if (invoiceSaleAmount <= 0) {
    return {
      response: `Invoice with ID ${invoiceId} has an amount of 0, skipping...`,
    };
  }

  // if currency is not USD, convert it to USD  based on the current FX rate
  // TODO: allow custom "defaultCurrency" on workspace table in the future
  if (invoice.currency && invoice.currency !== "usd") {
    const { currency: convertedCurrency, amount: convertedAmount } =
      await convertCurrency({
        currency: invoice.currency,
        amount: invoiceSaleAmount,
      });

    invoice.currency = convertedCurrency;
    invoiceSaleAmount = convertedAmount;
  }

  // Find lead
  const leadEvent = await getLeadEvent({ customerId: customer.id });
  if (!leadEvent) {
    return {
      response: `Lead event with customer ID ${customer.id} not found, skipping...`,
    };
  }

  const eventId = nanoid(16);

  // if the invoice has no subscription, it's a one-time payment
  const isOneTimePayment = invoice.lines.data.some(
    (line) => line.parent?.subscription_item_details === null,
  );

  const saleData = {
    ...leadEvent,
    workspace_id: leadEvent.workspace_id || customer.projectId, // in case for some reason the lead event doesn't have workspace_id
    event_id: eventId,
    event_name: isOneTimePayment ? "Purchase" : "Invoice paid",
    payment_processor: "stripe",
    amount: invoiceSaleAmount,
    currency: invoice.currency,
    invoice_id: invoiceId,
    metadata: JSON.stringify({
      invoice,
    }),
  };

  const linkId = leadEvent.link_id;
  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  if (!link) {
    return {
      response: `Link with ID ${linkId} not found, skipping...`,
    };
  }

  const firstConversionFlag = isFirstConversion({
    customer,
    linkId,
  });

  const [_sale, linkUpdated] = await Promise.all([
    recordSale(saleData),

    // update link stats
    prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        ...(firstConversionFlag && {
          conversions: {
            increment: 1,
          },
          lastConversionAt: new Date(),
        }),
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: invoiceSaleAmount,
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
          increment: invoiceSaleAmount,
        },
        firstSaleAt: customer.firstSaleAt ? undefined : new Date(),
      },
    }),
  ]);

  waitUntil(
    Promise.allSettled([
      sendWorkspaceWebhook({
        trigger: "sale.created",
        workspace,
        data: transformSaleEventData({
          ...saleData,
          clickedAt: customer.clickedAt || customer.createdAt,
          link: linkUpdated,
          customer,
          metadata: null,
        }),
      }),

      queueGoogleAdsConversionUpload({
        workspaceId: workspace.id,
        eventType: "sale",
        eventName: saleData.event_name,
        conversionDateTime: new Date().toISOString(),
        eventId: saleData.event_id,
        conversionValue: saleData.amount,
        currencyCode: saleData.currency,
        click: {
          id: saleData.click_id,
          url: saleData.url,
        },
      }),
    ]),
  );

  return {
    response: `Sale recorded for customer ID ${customer.id} and invoice ID ${invoiceId}`,
  };
}
