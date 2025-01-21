import { notifyPartnerSale } from "@/lib/api/partners/notify-partner-sale";
import { createSaleData } from "@/lib/api/sales/create-sale-data";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { prisma } from "@dub/prisma";
import { Customer } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";

// Handle event "checkout.session.completed"
export async function checkoutSessionCompleted(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Checkout.Session;
  const dubCustomerId = charge.metadata?.dubCustomerId;
  const stripeAccountId = event.account as string;
  const stripeCustomerId = charge.customer as string;
  const invoiceId = charge.invoice as string;

  if (!dubCustomerId) {
    return "Customer ID not found in Stripe checkout session metadata, skipping...";
  }

  let customer: Customer;
  try {
    // Update customer with stripe customerId if exists
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
    // Skip if customer not found
    console.log(error);
    return `Customer with dubCustomerId ${dubCustomerId} not found, skipping...`;
  }

  if (invoiceId) {
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
  }

  if (charge.amount_total === 0) {
    return `Checkout session completed for customer with external ID ${dubCustomerId} and invoice ID ${invoiceId} but amount is 0, skipping...`;
  }

  // Find lead
  const leadEvent = await getLeadEvent({ customerId: customer.id });
  if (!leadEvent || leadEvent.data.length === 0) {
    return `Lead event with customer ID ${customer.id} not found, skipping...`;
  }

  const saleData = {
    ...leadEvent.data[0],
    event_id: nanoid(16),
    event_name: "Subscription creation",
    payment_processor: "stripe",
    amount: charge.amount_total!,
    currency: charge.currency!,
    invoice_id: invoiceId || "",
    metadata: JSON.stringify({
      charge,
    }),
  };

  // Find link
  const linkId = leadEvent.data[0].link_id;
  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  if (!link) {
    return `Link with ID ${linkId} not found, skipping...`;
  }

  const [_sale, _link, workspace] = await Promise.all([
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
          increment: charge.amount_total!,
        },
      },
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
          increment: charge.amount_total!,
        },
      },
    }),
  ]);

  // for program links
  if (link.programId) {
    const { program, partnerId, commissionAmount } =
      await prisma.programEnrollment.findUniqueOrThrow({
        where: {
          linkId: link.id,
        },
        select: {
          program: true,
          partnerId: true,
          commissionAmount: true,
        },
      });

    const saleRecord = createSaleData({
      program,
      partner: {
        id: partnerId,
        commissionAmount,
      },
      customer: {
        id: saleData.customer_id,
        linkId: saleData.link_id,
        clickId: saleData.click_id,
      },
      sale: {
        amount: saleData.amount,
        currency: saleData.currency,
        invoiceId: saleData.invoice_id,
        eventId: saleData.event_id,
        paymentProcessor: saleData.payment_processor,
      },
      metadata: {
        ...leadEvent.data[0],
        stripeMetadata: charge,
      },
    });

    await prisma.sale.create({
      data: saleRecord,
    });

    waitUntil(
      notifyPartnerSale({
        partner: {
          id: partnerId,
          referralLink: link.shortLink,
        },
        program,
        sale: {
          amount: saleRecord.amount,
          earnings: saleRecord.earnings,
        },
      }),
    );
  }

  // send workspace webhook
  waitUntil(
    sendWorkspaceWebhook({
      trigger: "sale.created",
      workspace,
      data: transformSaleEventData({
        ...saleData,
        link,
        customerId: customer.id,
        customerExternalId: customer.externalId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
        customerCreatedAt: customer.createdAt,
      }),
    }),
  );

  return `Checkout session completed for customer with external ID ${dubCustomerId} and invoice ID ${invoiceId}`;
}
