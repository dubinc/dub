"use client";

import { intervals } from "@/lib/analytics/constants";
import usePartnerLinks from "@/lib/swr/use-partner-links";
import { CardList } from "@dub/ui";
import { ChartTooltipSync } from "@dub/ui/charts";
import { createContext, useContext } from "react";
import { PartnerLinkCard } from "./partner-link-card";

const PartnerLinksContext = createContext<{
  start: Date;
  end: Date;
  interval: (typeof intervals)[number];
} | null>(null);

export function usePartnerLinksContext() {
  const context = useContext(PartnerLinksContext);
  if (!context)
    throw new Error(
      "usePartnerLinksContext must be used within a PartnerLinksContext.Provider",
    );

  return context;
}

export function ProgramLinksPageClient() {
  const { links, error, loading } = usePartnerLinks();

  const start = new Date("2025-01-21");
  const end = new Date("2025-02-21");
  const interval = "24h";

  return (
    <PartnerLinksContext.Provider value={{ start, end, interval }}>
      <ChartTooltipSync>
        <CardList>
          {error ? (
            <div className="flex items-center justify-center px-5 py-3">
              <p className="text-sm text-neutral-600">Failed to load links.</p>
            </div>
          ) : loading ? (
            [...Array(3)].map((_, i) => <LinkCardSkeleton key={i} />)
          ) : (
            links?.map((link) => <PartnerLinkCard key={link.id} link={link} />)
          )}
        </CardList>
      </ChartTooltipSync>
    </PartnerLinksContext.Provider>
  );
}

function LinkCardSkeleton() {
  return (
    <CardList.Card innerClassName="flex items-center justify-between gap-4 h-[66px]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative hidden size-8 shrink-0 animate-pulse rounded-full bg-neutral-200 sm:flex" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="h-5 w-32 animate-pulse rounded-md bg-neutral-200" />
          <div className="h-4 w-48 animate-pulse rounded-md bg-neutral-200" />
        </div>
      </div>
      <div className="h-7 w-16 animate-pulse rounded-md bg-neutral-200" />
    </CardList.Card>
  );
}
