import { qstash } from "@/lib/cron";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Invoice } from "@prisma/client";
import * as z from "zod/v4";

type FundSettlementTiming =
  | {
      fundsAvailable: true;
    }
  | {
      fundsAvailable: false;
      scheduledAt: Date;
    };

export const stripeChargeMetadataSchema = z.object({
  id: z.string(),
});

export async function scheduleDelayedPayouts({
  invoice,
  executeAt,
}: {
  invoice: Pick<Invoice, "id">;
  executeAt: Date;
}) {
  const scheduleTimeMs = executeAt.getTime();

  const delaySeconds = Math.max(
    0,
    Math.floor((scheduleTimeMs - Date.now()) / 1000),
  );

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/charge-succeeded`,
    delay: delaySeconds + 5 * 60, // 5 minutes delay to give some buffer for the card charge to settle fully
    deduplicationId: `retry-delayed-payouts-${invoice.id}`, // The deduplication window is 10 minutes
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
      `Scheduled delayed payouts for invoice ${invoice.id} at ${scheduledAt.toISOString()}.`,
      {
        qstashResponse,
      },
    );
  } else {
    throw new Error(
      `Failed to schedule delayed payouts for invoice ${invoice.id}`,
    );
  }
}

// For payouts that move funds out of Dub's balance directly (stablecoin, PayPal, Tremendous),
// schedule a cron job at `available_on + 15 minutes`. These payout methods do not support
// `source_transaction`, so they must be triggered only after the funding charge's funds settle —
// otherwise we'd be fronting money on a card charge that can still be reversed before it posts.
export async function getFundSettlementTiming(invoice: {
  id: string;
  stripeChargeMetadata: unknown;
}): Promise<FundSettlementTiming> {
  const stripeChargeMetadata = stripeChargeMetadataSchema.parse(
    invoice.stripeChargeMetadata,
  );

  const chargeId = stripeChargeMetadata.id;

  const balanceTransactions = await stripe.balanceTransactions.list({
    source: chargeId,
  });

  const now = Date.now();

  if (balanceTransactions.data.length === 0) {
    console.log(
      `No balance transaction found for charge ${chargeId}, retrying in 1 hour...`,
    );

    return {
      fundsAvailable: false,
      scheduledAt: new Date(now + 60 * 60 * 1000), // 1 hour from now
    };
  }

  const balanceTransaction = balanceTransactions.data[0];
  const availableOnMs = balanceTransaction.available_on * 1000;

  if (availableOnMs <= now) {
    console.log(`Funds are available for charge ${chargeId}`);

    return {
      fundsAvailable: true,
    };
  }

  // schedule the qstash job 15 minutes after the funds will be available (to give some buffer)
  const scheduledAt = new Date(availableOnMs + 15 * 60 * 1000);

  console.log(
    `Funds are not available for charge ${chargeId}, scheduling payout for ${scheduledAt.toISOString()}`,
  );

  return {
    fundsAvailable: false,
    scheduledAt,
  };
}
