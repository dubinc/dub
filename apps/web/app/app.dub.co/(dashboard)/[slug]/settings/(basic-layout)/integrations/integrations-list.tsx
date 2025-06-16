import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { prisma } from "@dub/prisma";
import { Integration } from "@dub/prisma/client";
import { Suspense } from "react";
import { EnabledIntegrations } from "./enabled-integrations";
import {
  FeaturedIntegrations,
  FeaturedIntegrationsLoader,
} from "./featured-integrations";
import {
  IntegrationsCards,
  IntegrationsCardsLoader,
} from "./integrations-cards";

export async function IntegrationsList() {
  return (
    <div className="flex flex-col gap-12">
      <Suspense
        fallback={
          <>
            <div className="box-content h-9 animate-pulse rounded-md bg-neutral-200 py-px" />
            <FeaturedIntegrationsLoader />
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
      <SearchBoxPersisted debounceTimeoutMs={250} />
      <EnabledIntegrations integrations={integrations} />
      <FeaturedIntegrations integrations={integrations} />
      <IntegrationsCards integrations={integrations} />
    </>
  );
}
