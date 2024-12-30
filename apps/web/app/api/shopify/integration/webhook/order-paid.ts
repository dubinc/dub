import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function orderPaid({
  body,
  workspaceId,
}: {
  body: any;
  workspaceId: string;
}) {
  const checkoutToken = body.checkout_token;

  await redis.hset(`shopify:checkout:${checkoutToken}`, {
    order: body,
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
