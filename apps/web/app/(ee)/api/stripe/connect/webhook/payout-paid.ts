import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import Stripe from "stripe";

const queue = qstash.queue({
  queueName: "handle-payout-paid",
});

export async function payoutPaid(event: Stripe.Event) {
  const stripeAccount = event.account;

  if (!stripeAccount) {
    return "No stripeConnectId found in event. Skipping...";
  }

  const stripePayout = event.data.object as Stripe.Payout;
  const stripePayoutTraceId = stripePayout.trace_id?.value ?? null;

  const response = await queue.enqueueJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/payout-paid`,
    deduplicationId: event.id,
    method: "POST",
    body: {
      stripeAccount,
      stripePayout: {
        id: stripePayout.id,
        traceId: stripePayoutTraceId,
        amount: stripePayout.amount,
        currency: stripePayout.currency,
        arrivalDate: stripePayout.arrival_date,
      },
    },
  });

  return `Enqueued payout paid for partner ${stripeAccount}: ${response.messageId}`;
}
