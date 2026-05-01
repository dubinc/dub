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
            <FeaturedIntegrationsLoader />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="h-6 w-48 animate-pulse rounded-md bg-neutral-200" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-neutral-200 sm:max-w-sm" />
            </div>
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
      <FeaturedIntegrations integrations={integrations} />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold leading-7 text-neutral-900">
            Available integrations
          </h2>
          <div className="w-full sm:max-w-sm">
            <SearchBoxPersisted
              debounceTimeoutMs={250}
              inputClassName="h-10"
              placeholder="Search integrations..."
            />
          </div>
        </div>
        <IntegrationsCards integrations={integrations} />
      </div>
    </>
  );
}
