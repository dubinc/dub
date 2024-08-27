"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationProps } from "@/lib/types";
import IntegrationCard from "@/ui/integrations/integration-card";

export default function IntegrationsPageClient({
  integrations,
}: {
  integrations: InstalledIntegrationProps[];
}) {
  const { conversionEnabled } = useWorkspace();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {integrations
        .filter(
          (integration) => integration.slug !== "stripe" || conversionEnabled,
        )
        .map((integration) => (
          <IntegrationCard key={integration.id} {...integration} />
        ))}
    </div>
  );
}
