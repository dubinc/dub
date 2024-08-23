import { prisma } from "@/lib/prisma";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { dispatchWebhook } from "@/lib/webhook/publish";
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

  let customer;
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

  await Promise.all([
    recordSale(saleData),

    // update link sales count
    prisma.link.update({
      where: {
        id: leadEvent.data[0].link_id,
      },
      data: {
        sales: {
          increment: 1,
        },
      },
    }),
  ]);

  waitUntil(
    (async () => {
      const workspace = await prisma.project.findUniqueOrThrow({
        where: {
          id: customer.projectId,
        },
        select: {
          id: true,
          webhookEnabled: true,
        },
      });

      dispatchWebhook("sale.created", {
        workspace,
        data: {
          ...customer,
          ...saleData,
        },
      });
    })(),
  );

  return `Checkout session completed for customer with external ID ${dubCustomerId} and invoice ID ${invoiceId}`;
}
