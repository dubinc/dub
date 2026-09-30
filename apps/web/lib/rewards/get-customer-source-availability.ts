import { SUBMITTED_LEADS_ENABLED_PROGRAM_IDS } from "@/lib/submitted-leads/constants";
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
  programId,
  installedIntegrationIds,
}: {
  source: string;
  programId?: string;
  installedIntegrationIds?: string[];
}): { hidden: boolean; missingIntegration?: RequiredIntegration } {
  if (source === "submitted") {
    return {
      hidden:
        !programId || !SUBMITTED_LEADS_ENABLED_PROGRAM_IDS.includes(programId),
    };
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
