import { qstash } from "@/lib/cron";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";

const stripeChargeMetadataSchema = z.object({
  id: z.string(),
});

interface StablecoinScheduleResult {
  nextAction: "skip" | "executeNow";
}

// For stablecoin payouts, schedule a cron job at `available_on + 15 minutes`
// because Stablecoin financial accounts do not support `source_transaction`,
// so the payout must be triggered after funds become available.
export async function scheduleDelayedStablecoinPayouts(invoice: {
  id: string;
  stripeChargeMetadata: unknown;
}): Promise<StablecoinScheduleResult> {
  const stripeChargeMetadata = stripeChargeMetadataSchema.parse(
    invoice.stripeChargeMetadata,
  );

  const balanceTransactions = await stripe.balanceTransactions.list({
    source: stripeChargeMetadata.id,
  });

  const now = Date.now();
  let scheduleTimeMs = 0;

  // Balance transaction is not available
  if (balanceTransactions.data.length === 0) {
    console.log(
      `No balance transaction found for charge ${stripeChargeMetadata.id}`,
    );

    scheduleTimeMs = now + 1 * 60 * 60 * 1000;
  }

  // Balance transaction is available
  else {
    const balanceTransaction = balanceTransactions.data[0];

    console.log(
      `Found balance transaction for charge invoice ${invoice.id}: ${balanceTransaction.id}`,
      {
        available_on: balanceTransaction.available_on,
      },
    );

    const availableOnMs = balanceTransaction.available_on * 1000;

    // Funds already available, execute immediately
    if (availableOnMs <= now) {
      return {
        nextAction: "executeNow",
      };
    }

    scheduleTimeMs = availableOnMs + 15 * 60 * 1000;
  }

  // Schedule the QStash job
  const delaySeconds = Math.max(
    0,
    Math.floor((scheduleTimeMs - Date.now()) / 1000),
  );

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/charge-succeeded`,
    delay: delaySeconds,
    flowControl: {
      key: invoice.id,
      rate: 1,
    },
    body: {
      invoiceId: invoice.id,
    },
  });

  if (qstashResponse.messageId) {
    const scheduledAt = new Date(scheduleTimeMs);

    console.log(
      `Scheduled delayed stablecoin payout for invoice ${invoice.id} at ${scheduledAt.toISOString()}.`,
      {
        qstashResponse,
      },
    );
  } else {
    console.error(
      `Failed to schedule delayed stablecoin payout for invoice ${invoice.id}`,
      {
        qstashResponse,
      },
    );
  }

  return {
    nextAction: "skip",
  };
}
