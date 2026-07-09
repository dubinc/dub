import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS } from "@/lib/tremendous/constants";
import { createTremendousCampaign } from "@/lib/tremendous/create-tremendous-campaign";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import {
  Invoice,
  PartnerPayoutMethod,
  PayoutMode,
  PayoutStatus,
} from "@prisma/client";

const queue = qstash.queue({
  queueName: "send-tremendous-payout",
});

export async function queueTremendousPayouts({
  invoice,
}: {
  invoice: Pick<Invoice, "id" | "payoutMode" | "programId">;
}) {
  if (invoice.payoutMode === "external") {
    console.log(
      `Invoice ${invoice.id} is paid externally, skipping Tremendous payouts...`,
    );
    return;
  }

  // should never happen, but just in case
  if (!invoice.programId) {
    console.log(
      `Invoice ${invoice.id} has no program ID, skipping Tremendous payouts...`,
    );
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

  // if there are partners to send via Tremendous, we need to make sure the program has tremendousCampaignId set
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: invoice.programId,
    },
    select: {
      id: true,
      name: true,
      logo: true,
      tremendousCampaignId: true,
    },
  });

  if (!program.tremendousCampaignId) {
    await createTremendousCampaign(program);
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
