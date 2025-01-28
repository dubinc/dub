import IntegrationCard from "@/ui/integrations/integration-card";
import OAuthAppPlaceholder from "@/ui/oauth-apps/oauth-app-placeholder";
import { prisma } from "@dub/prisma";
import { Integration } from "@prisma/client";
import { Suspense } from "react";
import { EnabledIntegrations } from "./enabled-integrations";

export async function IntegrationsList() {
  return (
    <div className="flex flex-col gap-12">
      <Suspense
        fallback={
          <>
            <IntegrationsCardsLoader />
          </>
        }
      >
        <IntegrationsListRSC />
      </Suspense>
    </div>
  );
}

export type IntegrationsWithInstallations = (Integration & {
  _count: { installations: number };
})[];

async function IntegrationsListRSC() {
  const integrations = await prisma.integration.findMany({
    where: {
      verified: true,
    },
    include: {
      _count: {
        select: {
          installations: true,
        },
      },
    },
  });

  return (
    <>
      <EnabledIntegrations integrations={integrations} />
      <IntegrationsCards integrations={integrations} />
    </>
  );
}

async function IntegrationsCards({
  integrations,
}: {
  integrations: IntegrationsWithInstallations;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {integrations.map((integration) => (
        <IntegrationCard
          key={integration.id}
          {...integration}
          installations={integration._count.installations}
        />
      ))}
    </div>
  );
}

async function IntegrationsCardsLoader() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <OAuthAppPlaceholder key={i} />
      ))}
    </div>
  );
}
