"use client";

import useCommissionsTopPartners, {
  CommissionsTopPartner,
} from "@/lib/swr/use-commissions-top-partners";
import {
  Button,
  Table,
  useKeyboardShortcut,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { cn, COUNTRIES, currencyFormatter } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { PartnerAnalyticsFilterCell } from "./partner-analytics-filter-cell";

const PAGE_SIZE = 10;

export function CommissionsPartnersTable({
  queryString,
}: {
  queryString: string;
}) {
  const { queryParams, searchParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination(PAGE_SIZE);

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
    if (!stagedPartnerIds || stagedPartnerIds.length === 0) return;
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

  const {
    partners: allPartners,
    isLoading,
    error,
  } = useCommissionsTopPartners({
    queryString,
  });

  const pageData = useMemo(
    () =>
      allPartners?.slice(
        (pagination.pageIndex - 1) * PAGE_SIZE,
        pagination.pageIndex * PAGE_SIZE,
      ),
    [allPartners, pagination.pageIndex],
  );

  const { table, ...tableProps } = useTable<CommissionsTopPartner>({
    data: pageData ?? [],
    columns: [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        minSize: 220,
        cell: ({ row }) => {
          const { partnerId, name, image } = row.original;
          return (
            <PartnerAnalyticsFilterCell
              partner={{ id: partnerId, name, image }}
              partnerId={partnerId}
              isStaged={stagedPartnerIds?.includes(partnerId) ?? false}
              isApplied={activePartnerIdsFromUrl.includes(partnerId)}
              onToggle={() => toggleStagePartner(partnerId)}
              onApplyImmediate={() => {
                queryParams({
                  set: { partnerId },
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
          const { country } = row.original;
          if (!country) return <span className="text-neutral-400">—</span>;
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
        id: "commission",
        header: "Commission",
        accessorFn: (d) => currencyFormatter(d.earnings),
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    sortBy: "commission",
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `partner${p ? "s" : ""}`,
    rowCount: allPartners?.length ?? 0,
    loading: isLoading,
    error: error ? "Failed to load partners" : undefined,
  });

  const showFloatingBar = stagedPartnerIds !== null || isFilterActive;

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
