import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function processPayoutInvoice({ invoice }: { invoice: Invoice }) {
  const payoutsToProcess = await prisma.payout.count({
    where: {
      invoiceId: invoice.id,
      status: {
        not: "completed",
      },
    },
  });

  if (payoutsToProcess === 0) {
    console.log(
      `No payouts to process found for invoice ${invoice.id}, skipping...`,
    );
    return;
  }

  // Queue Stripe and PayPal payouts to be sent via QStash
  const [stripeResult, paypalResult] = await Promise.allSettled([
    qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-stripe-payouts`,
      body: { invoiceId: invoice.id },
      deduplicationId: `${invoice.id}-stripe-payouts`,
    }),

    qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-paypal-payouts`,
      body: { invoiceId: invoice.id },
      deduplicationId: `${invoice.id}-paypal-payouts`,
    }),
  ]);

  if (stripeResult.status === "fulfilled" && stripeResult.value.messageId) {
    console.log(
      `Queued Stripe payout for invoice ${invoice.id} (QStash ID: ${stripeResult.value.messageId})`,
    );
  } else {
    console.error(
      `Failed to queue Stripe payout for invoice ${invoice.id}:`,
      stripeResult,
    );
  }

  if (paypalResult.status === "fulfilled" && paypalResult.value.messageId) {
    console.log(
      `Queued PayPal payout for invoice ${invoice.id} (QStash ID: ${paypalResult.value.messageId})`,
    );
  } else {
    console.error(
      `Failed to queue PayPal payout for invoice ${invoice.id}:`,
      paypalResult,
    );
  }
}
