import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getLeadEvent } from "@/lib/tinybird";
import { createShopifyLead } from "./create-lead";
import { createShopifySale } from "./create-sale";

// Process the order from Shopify webhook
export async function processOrder({
  event,
  workspaceId,
  customerId,
  clickId,
}: {
  event: unknown;
  workspaceId: string;
  customerId?: string; // ID of the customer in Dub
  clickId?: string; // ID of the click event from Shopify pixel
}) {
  try {
    // for existing customer
    if (customerId) {
      const leadEvent = await getLeadEvent({ customerId });

      if (!leadEvent || leadEvent.data.length === 0) {
        return new Response(
          `[Shopify] Lead event with customer ID ${customerId} not found, skipping...`,
        );
      }

      const leadData = leadEvent.data[0];

      await createShopifySale({
        leadData,
        event,
        workspaceId,
        customerId,
      });

      return;
    }

    // for new customer
    if (clickId) {
      const leadData = await createShopifyLead({
        clickId,
        workspaceId,
        event,
      });

      const { customer_id: customerId } = leadData;

      await createShopifySale({
        leadData,
        event,
        workspaceId,
        customerId,
      });

      return;
    }
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
