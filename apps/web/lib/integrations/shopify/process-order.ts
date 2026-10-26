import { prisma } from "@/lib/prisma";
import { getLeadEvent } from "@/lib/tinybird";
import { WorkspaceProps } from "@/lib/types";
import { createShopifyLead } from "./create-lead";
import { createShopifySale } from "./create-sale";
import { ShopifyOrder } from "./schema";

// Process the order from Shopify webhook
export async function processShopifyOrder({
  order,
  workspace,
  clickId,
}: {
  order: ShopifyOrder;
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  clickId: string | null; // ID of the click event from Shopify pixel
}) {
  const { customer: orderCustomer } = order;

  const sharedData = {
    checkoutToken: order.checkout_token,
    shopifyCustomerId: orderCustomer?.id,
  };

  // Check customer exists in the workspace
  if (orderCustomer) {
    const externalId = orderCustomer.id?.toString();

    const customer = await prisma.customer.findUnique({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId,
        },
      },
    });

    // Existing customer found
    if (customer) {
      const leadData = await getLeadEvent({
        customerId: customer.id,
      });

      if (!leadData) {
        // Not a skip — we cannot tell "no lead" from "Tinybird unavailable".
        // Throw so the job retries rather than creating a duplicate customer.
        throw new Error(
          `Lead event not found for customer ${customer.id}; refusing to re-attribute.`,
        );
      }

      const { saleData } = await createShopifySale({
        leadData,
        order,
        workspaceId: workspace.id,
        customerId: customer.id,
      });

      return {
        message: "Sale has been tracked for this order.",
        data: {
          ...sharedData,
          eventId: saleData.event_id,
          customerId: customer.id,
          attribution: "existing_lead",
        },
      };
    }
  }

  // New customer
  if (clickId) {
    const { leadData } = await createShopifyLead({
      order,
      clickId,
      workspaceId: workspace.id,
    });

    const { saleData } = await createShopifySale({
      leadData,
      order,
      workspaceId: workspace.id,
      customerId: leadData.customer_id,
    });

    return {
      message: "Sale has been tracked for this order.",
      data: {
        ...sharedData,
        eventId: saleData.event_id,
        customerId: leadData.customer_id,
        attribution: "click",
      },
    };
  }
}
