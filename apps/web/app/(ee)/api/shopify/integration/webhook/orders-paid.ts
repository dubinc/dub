import {
  tryDispatchShopifyOrderJob,
  writeShopifyCheckoutFields,
} from "@/lib/integrations/shopify/checkout-cache";
import { shopifyOrderSchema } from "@/lib/integrations/shopify/schema";
import { processShopifyOrderJob } from "@/lib/jobs/handlers/process-shopify-order-job";
import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";

export async function ordersPaid({
  event,
  workspace,
}: {
  event: any;
  workspace: Pick<WorkspaceProps, "id" | "defaultProgramId">;
}) {
  const order = shopifyOrderSchema.parse(event);
  const {
    customer: orderCustomer,
    checkout_token: checkoutToken,
    discount_codes: discountCodes,
  } = order;

  // If the order has a customer, try to find the customer in our database
  if (orderCustomer) {
    const { id: externalId } = orderCustomer;

    const customer = await prisma.customer.findUnique({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId: externalId.toString(),
        },
      },
      select: {
        id: true,
      },
    });

    if (customer) {
      await processShopifyOrderJob.dispatch(
        {
          order,
          clickId: null,
          workspaceId: workspace.id,
        },
        {
          deduplicationId: `shopify-order-${checkoutToken}`,
        },
      );

      return `[Shopify] Existing customer ${customer.id} found. Order queued for processing.`;
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
      await processShopifyOrderJob.dispatch(
        {
          order,
          clickId: null,
          workspaceId: workspace.id,
        },
        {
          deduplicationId: `shopify-order-${checkoutToken}`,
        },
      );

      return `[Shopify] Partner discount code ${programDiscountCodes[0].code} found. Order queued for processing.`;
    }
  }

  // At this stage, we know the order has no customer or partner discount code
  // so we need to wait for the pixel event to arrive as this could be a new customer coming via a link
  const checkout = await writeShopifyCheckoutFields({
    checkoutToken,
    fields: {
      order,
      workspaceId: workspace.id,
    },
  });

  const dispatched = await tryDispatchShopifyOrderJob({
    checkoutToken,
    checkout,
  });

  if (dispatched) {
    return `[Shopify] Click ID ${checkout.clickId} found. Order queued for processing.`;
  }

  return "[Shopify] Waiting for pixel event to arrive...";
}
