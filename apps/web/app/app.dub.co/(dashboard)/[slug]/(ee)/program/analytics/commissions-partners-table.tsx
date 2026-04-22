"use client";

import {
  Button,
  Table,
  useKeyboardShortcut,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import {
  CommissionStatusFilter,
  MOCK_COMMISSION_PARTNERS,
  MockCommissionPartner,
} from "./commissions-mock-data";
import { PartnerAnalyticsFilterCell } from "./partner-analytics-filter-cell";

export function CommissionsPartnersTable({
  status,
}: {
  status: CommissionStatusFilter;
}) {
  const { queryParams, searchParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination(10);

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

  const pageData = useMemo(
    () =>
      MOCK_COMMISSION_PARTNERS.slice(
        (pagination.pageIndex - 1) * pagination.pageSize,
        pagination.pageIndex * pagination.pageSize,
      ),
    [pagination],
  );

  const { table, ...tableProps } = useTable<MockCommissionPartner>({
    data: pageData,
    columns: [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        minSize: 220,
        cell: ({ row }) => {
          const { id, name, image } = row.original;
          return (
            <PartnerAnalyticsFilterCell
              partner={{ id, name, image }}
              partnerId={id}
              isStaged={stagedPartnerIds?.includes(id) ?? false}
              isApplied={activePartnerIdsFromUrl.includes(id)}
              onToggle={() => toggleStagePartner(id)}
              onApplyImmediate={() => {
                queryParams({
                  set: { partnerId: id },
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
        id: "group",
        header: "Group",
        minSize: 140,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.original.groupColor }}
            />
            <span className="truncate text-sm text-neutral-700">
              {row.original.groupName}
            </span>
          </div>
        ),
      },
      {
        id: "location",
        header: "Location",
        minSize: 140,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <img
              alt={`${row.original.countryCode} flag`}
              src={`https://hatscripts.github.io/circle-flags/flags/${row.original.countryCode}.svg`}
              className="size-4 shrink-0"
            />
            <span className="min-w-0 truncate text-sm text-neutral-700">
              {row.original.country}
            </span>
          </div>
        ),
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
    rowCount: MOCK_COMMISSION_PARTNERS.length,
  });

  const showFloatingBar = stagedPartnerIds !== null || isFilterActive;

  return (
    <div className="relative">
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
