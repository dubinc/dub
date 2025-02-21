"use client";

import { intervals } from "@/lib/analytics/constants";
import { IntervalOptions } from "@/lib/analytics/types";
import usePartnerLinks from "@/lib/swr/use-partner-links";
import { usePartnerLinkModal } from "@/ui/modals/partner-link-modal";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { Button, CardList, useRouterStuff } from "@dub/ui";
import { ChartTooltipSync } from "@dub/ui/charts";
import { createContext, useContext, useMemo } from "react";
import { PartnerLinkCard } from "./partner-link-card";

const PartnerLinksContext = createContext<{
  start?: Date;
  end?: Date;
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
  const { searchParamsObj } = useRouterStuff();
  const { links, error, loading, isValidating } = usePartnerLinks();
  const { setShowPartnerLinkModal, PartnerLinkModal } = usePartnerLinkModal();

  const {
    start,
    end,
    interval = "30d",
  } = searchParamsObj as {
    start?: string;
    end?: string;
    interval?: IntervalOptions;
  };

  // Get first link sorted by createdAt
  const defaultLinkId = useMemo(
    () =>
      links?.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )[0]?.id,
    [links],
  );

  return (
    <div className="flex flex-col gap-5">
      <PartnerLinkModal />
      <div className="flex items-center justify-between">
        <SimpleDateRangePicker
          className="w-fit"
          align="start"
          defaultInterval="30d"
        />
        <Button
          text="Create Link"
          className="w-fit"
          shortcut="C"
          onClick={() => setShowPartnerLinkModal(true)}
        />
      </div>
      <PartnerLinksContext.Provider
        value={{
          start: start ? new Date(start) : undefined,
          end: end ? new Date(end) : undefined,
          interval,
        }}
      >
        <ChartTooltipSync>
          <CardList loading={isValidating}>
            {error ? (
              <div className="flex items-center justify-center px-5 py-3">
                <p className="text-sm text-neutral-600">
                  Failed to load links.
                </p>
              </div>
            ) : loading ? (
              <LinkCardSkeleton />
            ) : (
              links?.map((link) => (
                <PartnerLinkCard
                  key={link.id}
                  link={link}
                  isDefaultLink={link.id === defaultLinkId}
                />
              ))
            )}
          </CardList>
        </ChartTooltipSync>
      </PartnerLinksContext.Provider>
    </div>
  );
}

function LinkCardSkeleton() {
  return (
    <CardList.Card innerClassName="px-0 py-0" hoverStateEnabled={false}>
      <div className="h-[33px] rounded-t-xl bg-neutral-50"></div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative hidden size-11 shrink-0 animate-pulse rounded-full bg-neutral-200 sm:flex" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="h-6 w-32 animate-pulse rounded-md bg-neutral-200" />
              <div className="h-4 w-48 animate-pulse rounded-md bg-neutral-200" />
            </div>
          </div>
          <div className="h-7 w-16 animate-pulse rounded-md bg-neutral-200" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-[156px] rounded-lg border border-neutral-100"
            />
          ))}
        </div>
      </div>
    </CardList.Card>
  );
}
