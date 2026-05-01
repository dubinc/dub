"use client";

import { ApplicationEventStages } from "@/lib/types";
import {
  Button,
  Table,
  useKeyboardShortcut,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { cn, COUNTRIES, formatDate } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { PartnerAnalyticsFilterCell } from "../partner-analytics-filter-cell";
import { useApplicationsAnalytics } from "./use-applications-analytics";

const PAGE_SIZE = 10;

const STAGE_AT_KEY = {
  visited: "visitedAt",
  started: "startedAt",
  submitted: "submittedAt",
  approved: "approvedAt",
} as const;

const STAGE_LABEL = {
  visited: "Visited At",
  started: "Started At",
  submitted: "Submitted At",
  approved: "Enrolled At",
} as const;

export function ApplicationsPartnersTable({
  stage,
}: {
  stage: ApplicationEventStages;
}) {
  const { pagination, setPagination } = usePagination(PAGE_SIZE);
  const { queryParams, searchParams } = useRouterStuff();

  const [stagedPartnerIds, setStagedPartnerIds] = useState<string[] | null>(
    null,
  );

  const activePartnerIdsFromUrl = useMemo(
    () => searchParams.get("partnerId")?.split(",").filter(Boolean) ?? [],
    [searchParams],
  );

  const isFilterActive = searchParams.has("partnerId");

  const toggleStagePartner = useCallback(
    (partnerId: string) => {
      setStagedPartnerIds((prev) => {
        const base = prev ?? activePartnerIdsFromUrl;
        const next = base.includes(partnerId)
          ? base.filter((id) => id !== partnerId)
          : [...base, partnerId];
        return next.length === 0 ? null : next;
      });
    },
    [activePartnerIdsFromUrl],
  );

  const applyFilter = useCallback(() => {
    if (!stagedPartnerIds || stagedPartnerIds.length === 0) {
      return;
    }

    queryParams({
      set: { partnerId: stagedPartnerIds.join(",") },
      del: "page",
      scroll: false,
    });

    setStagedPartnerIds(null);
  }, [queryParams, stagedPartnerIds]);

  const clearFilter = useCallback(() => {
    setStagedPartnerIds(null);

    if (searchParams.has("partnerId")) {
      queryParams({ del: ["partnerId", "page"], scroll: false });
    }
  }, [queryParams, searchParams]);

  useKeyboardShortcut("Escape", () => setStagedPartnerIds(null), {
    enabled: stagedPartnerIds !== null,
    priority: 2,
  });

  const { data, error, isLoading } = useApplicationsAnalytics({
    groupBy: "partnerId",
  });

  const { table, ...tableProps } = useTable({
    data: data ?? [],
    columns: [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        minSize: 220,
        cell: ({ row }) => {
          const partner = row.original.partner;

          if (!partner) {
            return <span className="text-neutral-400">—</span>;
          }

          return (
            <PartnerAnalyticsFilterCell
              partner={partner}
              partnerId={partner.id}
              isStaged={stagedPartnerIds?.includes(partner.id) ?? false}
              isApplied={activePartnerIdsFromUrl.includes(partner.id)}
              onToggle={() => toggleStagePartner(partner.id)}
              onApplyImmediate={() => {
                queryParams({
                  set: { partnerId: partner.id },
                  del: "page",
                  scroll: false,
                });
                setStagedPartnerIds(null);
              }}
            />
          );
        },
      },
      {
        id: "location",
        header: "Location",
        minSize: 140,
        cell: ({ row }) => {
          const country = row.original.partner.country;

          if (!country) {
            return <span className="text-neutral-400">—</span>;
          }

          return (
            <div className="flex items-center gap-2">
              <img
                alt={`${country} flag`}
                src={`https://hatscripts.github.io/circle-flags/flags/${country.toLowerCase()}.svg`}
                className="size-4 shrink-0"
              />
              <span className="min-w-0 truncate text-sm text-neutral-700">
                {COUNTRIES[country] ?? country}
              </span>
            </div>
          );
        },
      },
      {
        id: "stageAt",
        header: STAGE_LABEL[stage],
        minSize: 160,
        accessorFn: (event) => {
          const trackedAt = event[STAGE_AT_KEY[stage]];

          return trackedAt ? formatDate(trackedAt, { month: "short" }) : "—";
        },
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    rowCount: data?.length ?? 0,
    loading: isLoading,
    error: error ? "Failed to load partners" : undefined,
  });

  const showFloatingBar = stagedPartnerIds !== null || isFilterActive;

  if (data && data.length === 0) {
    return null; // hide section if no partner-driven data
  }

  return (
    <div className={cn("relative", isLoading && "pointer-events-none")}>
      <Table
        {...tableProps}
        table={table}
        containerClassName="border-none"
        scrollWrapperClassName="min-h-[200px]"
      >
        <AnimatePresence>
          {showFloatingBar && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ ease: "easeOut", duration: 0.15 }}
              className="absolute bottom-1 left-0 z-20 flex h-16 w-full items-end bg-gradient-to-t from-white to-white/0"
            >
              <div className="flex w-full items-center justify-center gap-2 pb-2.5">
                {stagedPartnerIds !== null && stagedPartnerIds.length > 0 && (
                  <Button
                    text="Filter"
                    variant="primary"
                    className="h-8 w-fit rounded-lg px-3 py-2"
                    onClick={applyFilter}
                  />
                )}
                <Button
                  text="Clear"
                  variant="secondary"
                  className="h-8 w-fit rounded-lg px-3 py-2"
                  onClick={clearFilter}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Table>
    </div>
  );
}
