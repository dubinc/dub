import { qstash } from "@/lib/cron";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";

const stripeChargeMetadataSchema = z.object({
  balance_transaction: z.string(),
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

  const balanceTransaction = await stripe.balanceTransactions.retrieve(
    stripeChargeMetadata.balance_transaction,
  );

  const availableOnMs = balanceTransaction.available_on * 1000;
  const now = Date.now();

  if (availableOnMs <= now) {
    return {
      nextAction: "executeNow",
    };
  }

  const scheduleTimeMs = availableOnMs + 10 * 60 * 1000;

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
    );
  }

  return {
    nextAction: "skip",
  };
}
