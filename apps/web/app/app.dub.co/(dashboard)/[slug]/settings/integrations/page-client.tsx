"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationProps } from "@/lib/types";
import IntegrationCard from "@/ui/oauth-apps/integration-card";
import { redirect } from "next/navigation";

export default function IntegrationsPageClient({
  integrations,
}: {
  integrations: InstalledIntegrationProps[];
}) {
  const { slug, conversionEnabled, flags } = useWorkspace();

  if (!flags?.integrations) {
    redirect(`/${slug}/settings`);
  }

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
