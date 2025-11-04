import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { Invoice } from "@prisma/client";
import { z } from "zod";

const stripeChargeMetadataSchema = z.object({
  id: z.string(), // Stripe charge id
});

export async function queueStripePayouts(
  invoice: Pick<Invoice, "id" | "stripeChargeMetadata">,
) {
  const { id: invoiceId, stripeChargeMetadata } = invoice;

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
    },
  });

  const queue = qstash.queue({
    queueName: "send-stripe-payout",
  });

  for (const { partnerId } of partnersInCurrentInvoice) {
    const response = await queue.enqueueJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-stripe-payout`,
      deduplicationId: `${invoiceId}-${partnerId}`,
      method: "POST",
      body: {
        invoiceId,
        partnerId,
        chargeId,
      },
    });
    console.log(
      `Enqueued Stripe payout for invoice ${invoiceId} and partner ${partnerId}: ${response.messageId}`,
    );
  }
}
