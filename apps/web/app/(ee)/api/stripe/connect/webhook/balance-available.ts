import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import Stripe from "stripe";

const queue = qstash.queue({
  queueName: "stripe-balance-available",
});

export async function balanceAvailable(event: Stripe.Event) {
  const stripeAccount = event.account;

  if (!stripeAccount) {
    console.error(
      `Stripe connect account ${stripeAccount} not found. Skipping...`,
    );
    return;
  }

  await queue.upsert({
    parallelism: 10,
  });

  const response = await queue.enqueueJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/balance-available`,
    deduplicationId: event.id,
    method: "POST",
    body: {
      stripeAccount,
    },
  });

  console.log(response);
}
