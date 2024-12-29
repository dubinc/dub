import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

// TODO:
// Instead of checkout_token, maybe use order_number or checkout_id

export async function orderPaid({
  order,
  workspaceId,
}: {
  order: any;
  workspaceId: string;
}) {
  const checkoutToken = order.checkout_token;

  await redis.hset(`shopify:checkout:${checkoutToken}`, {
    order,
  });

  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/shopify/order-paid`,
    body: {
      checkoutToken,
      workspaceId,
    },
    retries: 3,
    delay: 3,
  });
}
