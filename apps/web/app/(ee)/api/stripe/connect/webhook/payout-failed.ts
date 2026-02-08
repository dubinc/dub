import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import Stripe from "stripe";

const queue = qstash.queue({
  queueName: "handle-payout-failed",
});

export async function payoutFailed(event: Stripe.Event) {
  const stripeAccount = event.account;

  if (!stripeAccount) {
    return "No stripeConnectId found in event. Skipping...";
  }

  const stripePayout = event.data.object as Stripe.Payout;

  const response = await queue.enqueueJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/payout-failed`,
    deduplicationId: event.id,
    method: "POST",
    body: {
      stripeAccount,
      stripePayout: {
        id: stripePayout.id,
        amount: stripePayout.amount,
        currency: stripePayout.currency,
        failureMessage: stripePayout.failure_message,
      },
    },
  });

  return `Enqueued payout failed for partner ${stripeAccount}: ${response.messageId}`;
}
