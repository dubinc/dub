"use client";

import IntegrationCard from "@/ui/integrations/integration-card";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { buttonVariants, Plus } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { IntegrationsWithInstallations } from "./integrations-list";

const CATEGORY_ORDER = [
  "Payments",
  "Automations",
  "Analytics",
  "Productivity",
  "Social Scheduling",
  "CMS",
  "Forms",
  "Authentication",
  "Dub",
  "Miscellaneous",
] as const;

const PRESENCE_ANIMATION = {
  initial: { opacity: 0, translateY: 10 },
  animate: { opacity: 1, translateY: 0 },
  exit: { opacity: 0, translateY: 10 },
  transition: { duration: 0.1 },
};

export function IntegrationsCards({
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

  // Sort integrations within each category
  Object.keys(groupedIntegrations).forEach((category) => {
    groupedIntegrations[category].sort((a, b) => {
      // Put "coming soon" integrations at the end
      if (a.comingSoon && !b.comingSoon) return 1;
      if (!a.comingSoon && b.comingSoon) return -1;
      // Sort by installation count in descending order
      return (b._count.installations || 0) - (a._count.installations || 0);
    });
  });

  const categories = Object.keys(groupedIntegrations).sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a as any) - CATEGORY_ORDER.indexOf(b as any),
  );

  return (
    <AnimatePresence initial={false} mode="wait">
      <>
        {categories.length > 0 && (
          <motion.div
            key={search}
            {...PRESENCE_ANIMATION}
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
        )}
        {!categories.length && (
          <motion.div key="empty" {...PRESENCE_ANIMATION}>
            <AnimatedEmptyState
              className="-mt-2"
              title="Integration not found"
              description="Let us know if you'd like to see it in the future."
              cardContent={() => (
                <div className="flex h-24 w-full items-center justify-center sm:h-32">
                  <div className="rounded-xl bg-neutral-100/50 p-4">
                    <Plus className="size-4 text-neutral-700" />
                  </div>
                </div>
              )}
              addButton={
                <a
                  href="mailto:support@dub.co?subject=Integration%20Request"
                  className={cn(
                    buttonVariants({ variant: "primary" }),
                    "flex h-8 items-center rounded-md border px-2.5 text-sm",
                  )}
                >
                  Request integration
                </a>
              }
            />
          </motion.div>
        )}
      </>
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
