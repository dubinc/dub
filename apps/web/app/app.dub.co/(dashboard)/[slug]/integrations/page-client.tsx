"use client";

import { InstalledIntegrationProps } from "@/lib/types";
import IntegrationCard from "@/ui/integrations/integration-card";

export default function IntegrationsPageClient({
  integrations,
}: {
  integrations: InstalledIntegrationProps[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {integrations.map((integration) => (
        <IntegrationCard key={integration.clientId} {...integration} />
      ))}
    </div>
  );
}
