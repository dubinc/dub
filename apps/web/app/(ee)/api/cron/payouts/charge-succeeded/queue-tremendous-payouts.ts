import { qstash } from "@/lib/cron";
import { TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS } from "@/lib/tremendous/constants";
import { prisma } from "@dub/prisma";
import {
  Invoice,
  PartnerPayoutMethod,
  PayoutMode,
  PayoutStatus,
} from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";

const queue = qstash.queue({
  queueName: "send-tremendous-payout",
});

export async function queueTremendousPayouts(
  invoice: Pick<Invoice, "id" | "paymentMethod" | "payoutMode">,
) {
  if (invoice.payoutMode === "external") {
    return;
  }

  const partnersInCurrentInvoice = await prisma.payout.groupBy({
    by: ["partnerId"],
    where: {
      invoiceId: invoice.id,
      status: PayoutStatus.processing,
      mode: PayoutMode.internal,
      method: PartnerPayoutMethod.tremendous,
      amount: {
        lte: TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS,
      },
      partner: {
        tremendousEmail: {
          not: null,
        },
        payoutsEnabledAt: {
          not: null,
        },
      },
    },
  });

  if (partnersInCurrentInvoice.length === 0) {
    console.log("No partners for sending via Tremendous, skipping...");
    return;
  }

  const chunkedPartners = chunk(partnersInCurrentInvoice, 100);

  for (let i = 0; i < chunkedPartners.length; i++) {
    const partnersInChunk = chunkedPartners[i];

    await Promise.all(
      partnersInChunk.map(({ partnerId }) =>
        queue.enqueueJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-tremendous-payout`,
          deduplicationId: `${invoice.id}-${partnerId}`,
          method: "POST",
          body: {
            partnerId,
            invoiceId: invoice.id,
          },
        }),
      ),
    );

    console.log(
      `Enqueued Tremendous payout for ${partnersInChunk.length} partners in chunk ${i + 1} of ${chunkedPartners.length}`,
    );
  }
}
