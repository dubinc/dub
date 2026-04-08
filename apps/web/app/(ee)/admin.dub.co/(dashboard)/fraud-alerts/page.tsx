"use client";

import { fraudAlertSchema } from "@/lib/zod/schemas/fraud";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { FraudAlertStatus } from "@dub/prisma/client";
import {
  Filter,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { CircleDotted, GridIcon } from "@dub/ui/icons";
import { fetcher, formatDateTime, OG_AVATAR_URL } from "@dub/utils";
import { Suspense, useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import * as z from "zod/v4";
import { ReviewFraudAlertSheet } from "./review-fraud-alert-sheet";

type FraudAlert = z.infer<typeof fraudAlertSchema>;

const FRAUD_ALERT_STATUS_BADGES: Record<
  FraudAlertStatus,
  { label: string; variant: "pending" | "error" | "neutral" }
> = {
  pending: { label: "Pending", variant: "pending" },
  confirmed: { label: "Confirmed", variant: "error" },
  dismissed: { label: "Dismissed", variant: "neutral" },
};

export default function FraudAlertsPage() {
  return (
    <Suspense>
      <FraudAlertsPageClient />
    </Suspense>
  );
}

function FraudAlertsPageClient() {
  const { queryParams, getQueryString, searchParamsObj } = useRouterStuff();
  const { status, programId } = searchParamsObj;

  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);

  const {
    data: { fraudAlerts, total } = {},
    isLoading,
    mutate,
  } = useSWR<{
    fraudAlerts: FraudAlert[];
    total: number;
  }>(`/api/admin/fraud-alerts${getQueryString()}`, fetcher, {
    keepPreviousData: true,
  });

  // Extract unique programs from fraud alerts for filter options
  const programs = useMemo(() => {
    if (!fraudAlerts) return [];
    const programMap = new Map<string, FraudAlert["program"]>();

    fraudAlerts.forEach((alert) => {
      if (!programMap.has(alert.program.id)) {
        programMap.set(alert.program.id, alert.program);
      }
    });

    return Array.from(programMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [fraudAlerts]);

  const filters = useMemo(
    () => [
      {
        key: "programId",
        icon: GridIcon,
        label: "Program",
        options:
          programs.map((program) => ({
            value: program.id,
            label: program.name,
            icon: (
              <img
                src={program.logo || `${OG_AVATAR_URL}${program.name}`}
                alt={`${program.name} image`}
                className="size-4 rounded-full"
              />
            ),
          })) ?? null,
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: Object.entries(FRAUD_ALERT_STATUS_BADGES).map(
          ([value, { label }]) => ({
            value,
            label,
          }),
        ),
      },
    ],
    [programs],
  );

  const activeFilters = useMemo(() => {
    return [
      ...(programId ? [{ key: "programId", value: programId }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
    ];
  }, [programId, status]);

  const onSelect = useCallback(
    (key: string, value: any) =>
      queryParams({
        set: { [key]: value },
        del: "page",
      }),
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string) =>
      queryParams({
        del: [key, "page"],
      }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["status", "programId", "page"],
      }),
    [queryParams],
  );

  const { pagination, setPagination } = usePagination(50);

  const { table, ...tableProps } = useTable({
    data: fraudAlerts ?? [],
    columns: [
      {
        id: "partner",
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <PartnerAvatar
              partner={row.original.partner}
              className="size-8 bg-white"
            />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-neutral-900">
                {row.original.partner.name}
              </span>
              <span className="truncate text-xs text-neutral-500">
                {row.original.partner.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "program",
        header: "Program",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <img
              src={
                row.original.program.logo ||
                `${OG_AVATAR_URL}${row.original.program.name}`
              }
              alt={row.original.program.name}
              className="size-4 rounded-full"
            />
            <span className="text-sm">{row.original.program.name}</span>
          </div>
        ),
      },
      {
        id: "reason",
        header: "Fraud Reason",
        cell: ({ row }) => (
          <span
            className="max-w-[300px] truncate text-sm text-neutral-600"
            title={row.original.reason}
          >
            {row.original.reason}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const badge = FRAUD_ALERT_STATUS_BADGES[row.original.status];
          return (
            <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
          );
        },
      },
      {
        id: "createdAt",
        header: "Flagged",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    resourceName: (plural) => `fraud alert${plural ? "s" : ""}`,
    rowCount: total ?? 0,
    loading: isLoading,
  });

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Fraud Alerts</h1>

      <div>
        <Filter.Select
          className="w-full md:w-fit"
          filters={filters}
          activeFilters={activeFilters}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      </div>

      {activeFilters.length > 0 && (
        <div>
          <Filter.List
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
            onRemoveAll={onRemoveAll}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <Table
          {...tableProps}
          table={table}
          onRowClick={(row) => {
            setSelectedAlert(row.original);
          }}
        />
      </div>

      <ReviewFraudAlertSheet
        alert={selectedAlert}
        isOpen={selectedAlert !== null}
        setIsOpen={(open) => {
          if (!open) setSelectedAlert(null);
        }}
        onReviewed={async () => {
          await mutate();
        }}
      />
    </div>
  );
}
