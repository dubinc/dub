"use client";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Discount } from "@dub/ui/icons";

export function ProgramSettingsDiscountsPageClient() {
  return (
    <AnimatedEmptyState
      title="Discounts"
      description="Offer discounts to partners when they refer customers"
      cardContent={() => {
        return (
          <>
            <Discount className="size-4 text-neutral-700" />
            <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
          </>
        );
      }}
      pillContent="Coming soon"
    />
  );
}
