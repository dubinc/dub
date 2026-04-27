import { qstash } from "@/lib/cron";
import { createShopifySale } from "@/lib/integrations/shopify/create-sale";
import {
  attributeViaDiscountCode,
  processOrder,
} from "@/lib/integrations/shopify/process-order";
import { orderSchema } from "@/lib/integrations/shopify/schema";
import { WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function ordersPaid({
  event,
  workspace,
}: {
  event: any;
  workspace: Pick<WorkspaceProps, "id" | "defaultProgramId" | "webhookEnabled">;
}) {
  const {
    customer: orderCustomer,
    checkout_token: checkoutToken,
    discount_codes: discountCodes,
  } = orderSchema.parse(event);

  if (orderCustomer) {
    const { id: externalId } = orderCustomer;

    const customer = await prisma.customer.findUnique({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId: externalId.toString(),
        },
      },
    });

    // customer is found, process the order right away
    if (customer) {
      await processOrder({
        event,
        workspaceId: workspace.id,
        customerId: customer.id,
      });

      return "[Shopify] Order event processed successfully.";
    }
  }

  // Check if the order has created using a program discount code
  if (discountCodes && discountCodes.length > 0 && workspace.defaultProgramId) {
    const programDiscountCodes = await prisma.discountCode.findMany({
      where: {
        programId: workspace.defaultProgramId,
        code: {
          in: discountCodes.map(({ code }) => code),
        },
      },
      include: {
        link: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (programDiscountCodes.length > 0) {
      const { customer, leadEvent: leadData } = await attributeViaDiscountCode({
        event,
        workspace,
        link: programDiscountCodes[0].link,
      });

      await createShopifySale({
        leadData,
        event,
        workspaceId: workspace.id,
        customerId: customer.id,
      });

      return "[Shopify] Order event processed successfully with discount codes.";
    }
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
      workspaceId: workspace.id,
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
        workspaceId: workspace.id,
      },
      retries: 5,
      delay: 3,
    });

    return "[Shopify] clickId not found, waiting for pixel event to arrive...";
  }
}
