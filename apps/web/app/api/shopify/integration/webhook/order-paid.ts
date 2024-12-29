import { redis } from "@/lib/upstash";

// TODO:
// Instead of checkout_token, maybe use order_number or checkout_id
// Add an expiry to the redis key

export async function orderPaid({
  event,
  workspaceId,
}: {
  event: any;
  workspaceId: string;
}) {
  const checkoutToken = event.checkout_token;

  await redis.set(`shopify:checkout:${checkoutToken}`, {
    ...event,
    workspaceId,
  });
}
