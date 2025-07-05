"use client";

import {
  DATE_RANGE_INTERVAL_PRESETS,
  DUB_PARTNERS_ANALYTICS_INTERVAL,
} from "@/lib/analytics/constants";
import { IntervalOptions } from "@/lib/analytics/types";
import usePartnerLinks from "@/lib/swr/use-partner-links";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { usePartnerLinkModal } from "@/ui/modals/partner-link-modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { Button, CardList, useKeyboardShortcut, useRouterStuff } from "@dub/ui";
import { ChartTooltipSync } from "@dub/ui/charts";
import { CursorRays, Hyperlink } from "@dub/ui/icons";
import { useParams } from "next/navigation";
import { createContext, useContext, useMemo } from "react";
import { PartnerLinkCard } from "./partner-link-card";

const PartnerLinksContext = createContext<{
  start?: Date;
  end?: Date;
  interval: (typeof DATE_RANGE_INTERVAL_PRESETS)[number];
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
  const { programSlug } = useParams() as { programSlug: string };
  const { searchParamsObj } = useRouterStuff();
  const { links, error, loading, isValidating } = usePartnerLinks();
  const { programEnrollment } = useProgramEnrollment();
  const { setShowPartnerLinkModal, PartnerLinkModal } = usePartnerLinkModal();

  const {
    start,
    end,
    interval = DUB_PARTNERS_ANALYTICS_INTERVAL,
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

  useKeyboardShortcut("c", () => setShowPartnerLinkModal(true));

  return (
    <div className="flex flex-col gap-5">
      <PartnerLinkModal />
      <div className="flex items-center justify-between">
        <SimpleDateRangePicker
          className="w-fit"
          align="start"
          defaultInterval={DUB_PARTNERS_ANALYTICS_INTERVAL}
        />
        {!["framer"].includes(programSlug) && (
          <Button
            text="Create Link"
            className="w-fit"
            shortcut="C"
            onClick={() => setShowPartnerLinkModal(true)}
            disabled={programEnrollment?.status === "banned"}
            disabledTooltip={
              programEnrollment?.status === "banned"
                ? "You are banned from this program."
                : undefined
            }
          />
        )}
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
            ) : links?.length === 0 ? (
              <AnimatedEmptyState
                title="No links yet"
                description="Get started by creating your first partner link to track your referrals."
                cardContent={
                  <>
                    <Hyperlink className="size-4 text-neutral-700" />
                    <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
                    <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-neutral-500">
                      <CursorRays className="size-3.5" />
                    </div>
                  </>
                }
                addButton={
                  <Button
                    text="Create Link"
                    onClick={() => setShowPartnerLinkModal(true)}
                    shortcut="C"
                  />
                }
              />
            ) : (
              links?.map((link) => (
                <PartnerLinkCard key={link.id} link={link} />
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
