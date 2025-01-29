import IntegrationCard from "@/ui/integrations/integration-card";
import { prisma } from "@dub/prisma";
import { Integration } from "@prisma/client";
import { Suspense } from "react";
import { EnabledIntegrations } from "./enabled-integrations";
import {
  FeaturedIntegrations,
  FeaturedIntegrationsLoader,
} from "./featured-integrations";

export async function IntegrationsList() {
  return (
    <div className="flex flex-col gap-12">
      <Suspense
        fallback={
          <>
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
      <EnabledIntegrations integrations={integrations} />
      <FeaturedIntegrations integrations={integrations} />
      <IntegrationsCards integrations={integrations} />
    </>
  );
}

const CATEGORY_ORDER = [
  "Payments",
  "Forms",
  "Social Scheduling",
  "Authentication",
  "CMS",
  "Automations",
  "Analytics",
  "Productivity",
  "Dub",
  "Miscellaneous",
] as const;

async function IntegrationsCards({
  integrations,
}: {
  integrations: IntegrationsWithInstallations;
}) {
  const groupedIntegrations = integrations.reduce(
    (acc, integration) => {
      const category = integration.category || "Miscellaneous";
      acc[category] = acc[category] || [];
      acc[category].push(integration);
      return acc;
    },
    {} as Record<string, IntegrationsWithInstallations>,
  );

  const categories = Object.keys(groupedIntegrations).sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a as any) - CATEGORY_ORDER.indexOf(b as any),
  );

  return (
    <>
      {categories.map((category) => (
        <div key={category}>
          <h2 className="font-medium leading-4 text-neutral-800">{category}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {groupedIntegrations[category]!.map((integration) => (
              <IntegrationCard
                key={integration.id}
                {...integration}
                installations={integration._count.installations}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function IntegrationsCardsLoader() {
  return [...Array(3)].map((_, idx) => (
    <div key={idx}>
      <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, idx) => (
          <div
            key={idx}
            className="h-[170px] animate-pulse rounded-lg bg-neutral-200"
          />
        ))}
      </div>
    </div>
  ));
}
