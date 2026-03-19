"use client";

import { AnalyticsResponse } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import {
  Button,
  Table,
  useKeyboardShortcut,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  capitalize,
  cn,
  COUNTRIES,
  currencyFormatter,
  fetcher,
  nFormatter,
} from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useContext, useMemo, useState } from "react";
import useSWR from "swr";
import { PartnerAnalyticsFilterCell } from "./partner-analytics-filter-cell";

export function AnalyticsPartnersTable() {
  const { selectedTab, queryString } = useContext(AnalyticsContext);
  const { queryParams, searchParams } = useRouterStuff();

  const [stagedPartnerIds, setStagedPartnerIds] = useState<string[]>([]);

  const { pagination, setPagination } = usePagination(10);

  const activePartnerIdsFromUrl = useMemo(
    () => searchParams.get("partnerId")?.split(",").filter(Boolean) ?? [],
    [searchParams],
  );

  const isFilterActive = searchParams.has("partnerId");

  const toggleStagePartner = useCallback((partnerId: string) => {
    setStagedPartnerIds((prev) =>
      prev.includes(partnerId)
        ? prev.filter((id) => id !== partnerId)
        : [...prev, partnerId],
    );
  }, []);

  const applyFilter = useCallback(() => {
    if (stagedPartnerIds.length === 0) return;
    queryParams({
      set: { partnerId: stagedPartnerIds.join(",") },
      del: "page",
    });
    setStagedPartnerIds([]);
  }, [queryParams, stagedPartnerIds]);

  const clearFilter = useCallback(() => {
    setStagedPartnerIds([]);
    if (searchParams.has("partnerId")) {
      queryParams({ del: ["partnerId", "page"] });
    }
  }, [queryParams, searchParams]);

  useKeyboardShortcut("Escape", () => setStagedPartnerIds([]), {
    enabled: stagedPartnerIds.length > 0,
    priority: 2,
  });

  const {
    data: topPartners,
    error: topPartnersError,
    isLoading: topPartnersLoading,
  } = useSWR<AnalyticsResponse["top_partners"][]>(
    `/api/analytics?${editQueryString(queryString, {
      event: selectedTab,
      groupBy: "top_partners",
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const topPartnersList = useMemo(() => {
    return topPartners?.slice(
      (pagination.pageIndex - 1) * pagination.pageSize,
      pagination.pageIndex * pagination.pageSize,
    );
  }, [topPartners, pagination]);

  const { table, ...tableProps } = useTable({
    data: topPartnersList || [],
    columns: [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        minSize: 250,
        cell: ({ row }) => {
          const p = row.original.partner;
          const partnerId = row.original.partnerId;
          return (
            <PartnerAnalyticsFilterCell
              partner={p}
              partnerId={partnerId}
              isStaged={stagedPartnerIds.includes(partnerId)}
              isApplied={activePartnerIdsFromUrl.includes(partnerId)}
              onToggle={() => toggleStagePartner(partnerId)}
            />
          );
        },
      },
      {
        id: "location",
        header: "Location",
        minSize: 150,
        cell: ({ row }) => {
          const country = row.original.partner.country;
          return (
            <div className="flex items-center gap-2">
              {country && (
                <img
                  alt={`${country} flag`}
                  src={`https://hatscripts.github.io/circle-flags/flags/${country.toLowerCase()}.svg`}
                  className="size-4 shrink-0"
                />
              )}
              <span className="min-w-0 truncate">
                {(country ? COUNTRIES[country] : null) ?? "-"}
              </span>
            </div>
          );
        },
      },
      ...(selectedTab === "sales"
        ? [
            {
              id: "sales",
              header: "Sales",
              accessorFn: (d: AnalyticsResponse["top_partners"]) =>
                nFormatter(d.sales),
            },
            {
              id: "saleAmount",
              header: "Revenue",
              accessorFn: (d: AnalyticsResponse["top_partners"]) =>
                currencyFormatter(d.saleAmount),
            },
          ]
        : [
            {
              id: selectedTab,
              header: `${capitalize(selectedTab)}`,
              accessorFn: (d: AnalyticsResponse["top_partners"]) =>
                nFormatter(d[selectedTab]),
            },
          ]),
    ],
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: ["clicks", "leads", "saleAmount"],
    sortBy: selectedTab === "sales" ? "saleAmount" : selectedTab,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `partner${p ? "s" : ""}`,
    rowCount: topPartners?.length ?? 0,
    loading: topPartnersLoading,
    error: topPartnersError ? "Failed to load partners" : undefined,
  });

  const showFloatingBar = stagedPartnerIds.length > 0 || isFilterActive;

  return !topPartnersList ? (
    <PartnerTableSkeleton />
  ) : topPartnersList.length > 0 ? (
    <div
      className={cn("relative", topPartnersLoading && "pointer-events-none")}
    >
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
              className="absolute bottom-0 left-0 z-20 flex w-full items-end"
            >
              <div className="flex w-full items-center justify-center gap-2 py-4">
                {stagedPartnerIds.length > 0 && (
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
  ) : (
    <div className="text-content-muted flex h-36 items-center justify-center text-sm">
      {topPartnersError ? "Failed to load partners." : "No partners found."}
    </div>
  );
}

function PartnerTableSkeleton() {
  const { selectedTab } = useContext(AnalyticsContext);
  return (
    <div className="bg-bg-default relative overflow-x-auto rounded-xl">
      <table className="group/table w-full border-separate border-spacing-0 text-sm transition-[border-spacing,margin-top] [&_tr:last-child>td]:border-b-transparent [&_tr>*:first-child]:border-l-transparent [&_tr>*:last-child]:border-r-transparent [&_tr]:border-b">
        <thead>
          <tr>
            <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
              Partner
            </th>
            <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
              Location
            </th>
            <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
              {capitalize(selectedTab)}
            </th>
            {selectedTab === "sales" && (
              <>
                <th className="border-border-subtle border-b border-l-0 px-4 py-2.5 text-left font-medium text-neutral-900">
                  Revenue
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {[...Array(10)].map((_, idx) => (
            <tr key={idx} className="group/row">
              <td className="border-border-subtle border-b border-l-0 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="size-6 animate-pulse rounded-full bg-neutral-200" />
                  <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
                </div>
              </td>
              <td className="border-border-subtle border-b border-l-0 px-4 py-2.5">
                <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
              </td>
              <td className="border-border-subtle border-b border-l-0 px-4 py-2.5">
                <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
              </td>
              {selectedTab === "sales" && (
                <td className="border-border-subtle border-b border-l-0 px-4 py-2.5">
                  <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
