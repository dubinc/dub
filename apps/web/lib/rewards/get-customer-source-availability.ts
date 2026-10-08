import { CustomerSource } from "@/lib/types";
import { HUBSPOT_INTEGRATION_ID, STRIPE_INTEGRATION_ID } from "@dub/utils";

type RequiredIntegration = { id: string; slug: string; name: string };

export const CUSTOMER_SOURCE_REQUIRED_INTEGRATIONS: Partial<
  Record<CustomerSource, RequiredIntegration>
> = {
  trial: { id: STRIPE_INTEGRATION_ID, slug: "stripe", name: "Stripe" },
  hubspot: { id: HUBSPOT_INTEGRATION_ID, slug: "hubspot", name: "HubSpot" },
};

export function getCustomerSourceAvailability({
  source,
  submittedLeadsEnabled,
  installedIntegrationIds,
}: {
  source: string;
  submittedLeadsEnabled?: boolean;
  installedIntegrationIds?: string[];
}): { hidden: boolean; missingIntegration?: RequiredIntegration } {
  if (source === "submitted") {
    return { hidden: !submittedLeadsEnabled };
  }

  const requiredIntegration =
    CUSTOMER_SOURCE_REQUIRED_INTEGRATIONS[source as CustomerSource];

  if (
    requiredIntegration &&
    !installedIntegrationIds?.includes(requiredIntegration.id)
  ) {
    return { hidden: false, missingIntegration: requiredIntegration };
  }

  return { hidden: false };
}
