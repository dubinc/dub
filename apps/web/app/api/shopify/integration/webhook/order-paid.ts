import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";

const schema = z.object({
  checkout_token: z.string(),
});

export async function orderPaid({
  body,
  workspaceId,
}: {
  body: any;
  workspaceId: string;
}) {
  const { checkout_token: checkoutToken } = schema.parse(body);

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
