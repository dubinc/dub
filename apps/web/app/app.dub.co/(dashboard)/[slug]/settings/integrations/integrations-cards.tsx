"use client";

import IntegrationCard from "@/ui/integrations/integration-card";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { IntegrationsWithInstallations } from "./integrations-list";

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

export async function IntegrationsCards({
  integrations,
}: {
  integrations: IntegrationsWithInstallations;
}) {
  const searchParams = useSearchParams();
  const search = searchParams.get("search");

  const groupedIntegrations = integrations
    .filter(
      (i) => !search || i.name.toLowerCase().includes(search.toLowerCase()),
    )
    .reduce(
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
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={search}
        initial={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        exit={{ opacity: 0, translateY: 10 }}
        transition={{ duration: 0.1 }}
        className="flex flex-col gap-12"
      >
        {categories.map((category) => (
          <div key={category}>
            <h2 className="font-medium leading-4 text-neutral-800">
              {category}
            </h2>
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
      </motion.div>
    </AnimatePresence>
  );
}

export function IntegrationsCardsLoader() {
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
