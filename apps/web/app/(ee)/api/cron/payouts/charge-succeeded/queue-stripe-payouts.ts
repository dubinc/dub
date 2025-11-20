import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, chunk, log } from "@dub/utils";
import { Invoice } from "@prisma/client";
import { z } from "zod";

const stripeChargeMetadataSchema = z.object({
  id: z.string(), // Stripe charge id
});

export async function queueStripePayouts(
  invoice: Pick<
    Invoice,
    "id" | "paymentMethod" | "stripeChargeMetadata" | "payoutMode"
  >,
) {
  // All payouts are processed externally, hence no need to queue Stripe payouts
  if (invoice.payoutMode === "external") {
    return;
  }

  const { id: invoiceId, paymentMethod, stripeChargeMetadata } = invoice;

  // Find the id of the charge that was used to fund the transfer
  const parsedChargeMetadata =
    stripeChargeMetadataSchema.safeParse(stripeChargeMetadata);
  const chargeId = parsedChargeMetadata?.success
    ? parsedChargeMetadata?.data.id
    : undefined;

  // this should never happen since all completed invoices should have a charge id, but just in case
  if (!chargeId) {
    await log({
      message:
        "No charge id found in stripeChargeMetadata for invoice " +
        invoiceId +
        ", continuing without source_transaction.",
      type: "errors",
    });
  }

  const partnersInCurrentInvoice = await prisma.payout.groupBy({
    by: ["partnerId"],
    where: {
      invoiceId,
      status: "processing",
      mode: "internal",
      partner: {
        stripeConnectId: {
          not: null,
        },
        payoutsEnabledAt: {
          not: null,
        },
      },
    },
  });

  const queue = qstash.queue({
    queueName: "send-stripe-payout",
  });

  const chunkedPartners = chunk(partnersInCurrentInvoice, 100);

  for (let i = 0; i < chunkedPartners.length; i++) {
    const partnersInChunk = chunkedPartners[i];
    await Promise.allSettled(
      partnersInChunk.map(({ partnerId }) => {
        return queue.enqueueJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-stripe-payout`,
          deduplicationId: `${invoiceId}-${partnerId}`,
          method: "POST",
          body: {
            invoiceId,
            partnerId,
            // only pass chargeId if payment method is card
            // this is because we're passing chargeId as source_transaction for card payouts since card payouts can take a short time to settle fully
            // we omit chargeId/source_transaction for other payment methods (ACH, SEPA, etc.) since those settle via charge.succeeded webhook after ~4 days
            // x-slack-ref: https://dub.slack.com/archives/C074P7LMV9C/p1758776038825219?thread_ts=1758769780.982089&cid=C074P7LMV9C
            ...(paymentMethod === "card" && { chargeId }),
          },
        });
      }),
    );
    console.log(
      `Enqueued Stripe payout for ${partnersInChunk.length} partners in chunk ${i + 1} of ${chunkedPartners.length}`,
    );
  }
}
