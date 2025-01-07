import { qstash } from "@/lib/cron";
import { processOrder } from "@/lib/integrations/shopify/process-order";
import { orderSchema } from "@/lib/integrations/shopify/schema";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function ordersPaid({
  event,
  workspaceId,
}: {
  event: any;
  workspaceId: string;
}) {
  const {
    customer: { id: externalId },
    checkout_token: checkoutToken,
  } = orderSchema.parse(event);

  const customer = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: workspaceId,
        externalId: externalId.toString(),
      },
    },
  });

  // customer is found, process the order right away
  if (customer) {
    await processOrder({
      event,
      workspaceId,
      customerId: customer.id,
    });

    return "[Shopify] Order event processed successfully.";
  }

  // Check the cache to see the pixel event for this checkout token exist before publishing the event to the queue
  const clickId = await redis.hget<string>(
    `shopify:checkout:${checkoutToken}`,
    "clickId",
  );

  // clickId is empty, order is not from a Dub link
  if (clickId === "") {
    await redis.del(`shopify:checkout:${checkoutToken}`);

    return "[Shopify] Order is not from a Dub link. Skipping...";
  }

  // clickId is found, process the order for the new customer
  else if (clickId) {
    await processOrder({
      event,
      workspaceId,
      clickId,
    });

    return "[Shopify] Order event processed successfully.";
  }

  // clickId is not found, we need to wait for the pixel event to come in so that we can decide if the order is from a Dub link or not
  else {
    await redis.hset(`shopify:checkout:${checkoutToken}`, {
      order: event,
    });

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/shopify/order-paid`,
      body: {
        checkoutToken,
        workspaceId,
      },
      retries: 5,
      delay: 3,
    });

    return "[Shopify] clickId not found, waiting for pixel event to arrive...";
  }
}
