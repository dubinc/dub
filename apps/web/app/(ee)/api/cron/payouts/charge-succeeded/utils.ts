import { qstash } from "@/lib/cron";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";

const stripeChargeMetadataSchema = z.object({
  id: z.string(),
});

interface Response {
  nextAction: "skip" | "executeNow";
}

// For stablecoin payouts, schedule a cron job at `available_on + 10 minutes`
// because Stablecoin financial accounts do not support `source_transaction`,
// so the payout must be triggered after funds become available.
export async function scheduleDelayedStablecoinPayouts(invoice: {
  id: string;
  stripeChargeMetadata: unknown;
}): Promise<Response> {
  const stripeChargeMetadata = stripeChargeMetadataSchema.parse(
    invoice.stripeChargeMetadata,
  );

  const balanceTransactions = await stripe.balanceTransactions.list({
    source: stripeChargeMetadata.id,
  });

  if (balanceTransactions.data.length === 0) {
    return {
      nextAction: "skip",
    };
  }

  const balanceTransaction = balanceTransactions.data[0];

  console.log(
    `Found balance transaction for charge invoice ${invoice.id}: ${balanceTransaction.id}`,
    {
      available_on: balanceTransaction.available_on,
    },
  );

  const availableOnMs = balanceTransaction.available_on * 1000;
  const now = Date.now();

  if (availableOnMs <= now) {
    return {
      nextAction: "executeNow",
    };
  }

  const scheduleTimeMs = availableOnMs + 15 * 60 * 1000; // 15 minutes

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
      `Balance transaction will be available at ${scheduledAt.toISOString()}. Scheduling Stablecoin payouts...`,
      {
        qstashResponse,
      },
    );
  }

  return {
    nextAction: "skip",
  };
}
