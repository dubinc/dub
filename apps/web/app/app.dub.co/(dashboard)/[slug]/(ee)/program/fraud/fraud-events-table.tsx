"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useFraudEvents } from "@/lib/swr/use-fraud-events";
import { useFraudEventsCount } from "@/lib/swr/use-fraud-events-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudEventProps } from "@/lib/types";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import {
  FraudEventStatus,
  FraudRiskLevel,
  FraudRuleType,
} from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  Button,
  EditColumnsButton,
  Filter,
  Icon,
  Popover,
  StatusBadge,
  Table,
  TimestampTooltip,
  useColumnVisibility,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { CircleCheck, CircleXmark, Dots, ShieldKeyhole } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useFraudEventsFilters } from "./use-fraud-events-filters";

const fraudEventsColumns = {
  all: [
    "partner",
    "flagged",
    "reasons",
    "riskLevel",
    "status",
    "riskScore",
    "createdAt",
  ],
  defaultVisible: ["partner", "flagged", "reasons", "riskLevel", "status"],
};

const FRAUD_RISK_LEVEL_BADGES = {
  high: {
    label: "High",
    variant: "error" as const,
  },
  medium: {
    label: "Medium",
    variant: "warning" as const,
  },
  low: {
    label: "Low",
    variant: "pending" as const,
  },
};

const FRAUD_EVENT_STATUS_BADGES = {
  pending: {
    label: "Pending",
    variant: "pending" as const,
  },
  safe: {
    label: "Safe",
    variant: "success" as const,
  },
  banned: {
    label: "Banned",
    variant: "error" as const,
  },
};

const FRAUD_RULE_TYPE_LABELS: Record<FraudRuleType, string> = {
  customer_ip_suspicious: "Suspicious IP",
  self_referral: "Self-Referral",
  customer_email_suspicious_domain: "Suspicious Email Domain",
  customer_ip_country_mismatch: "IP Country Mismatch",
  banned_referral_domain: "Banned Referral Domain",
  suspicious_activity_spike: "Activity Spike",
  paid_ad_traffic_detected: "Paid Ad Traffic",
  abnormally_fast_conversion: "Fast Conversion",
};

function formatTriggeredRules(triggeredRules: any): string {
  if (!triggeredRules || !Array.isArray(triggeredRules)) {
    return "-";
  }

  return triggeredRules
    .map((rule: any) => {
      const ruleType = rule.ruleType as FraudRuleType;
      return FRAUD_RULE_TYPE_LABELS[ruleType] || ruleType;
    })
    .join(", ");
}

export function FraudEventsTable() {
  const { queryParams, searchParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();

  const status = (searchParams.get("status") || "pending") as FraudEventStatus;
  const riskLevelParam = searchParams.get("riskLevel");
  const riskLevel = riskLevelParam
    ? (riskLevelParam as FraudRiskLevel)
    : undefined;
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  } = useFraudEventsFilters();

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "fraud-events-table-columns",
    fraudEventsColumns,
  );

  const { pagination, setPagination } = usePagination();

  const { fraudEventsCount, error: countError } = useFraudEventsCount<number>({
    status,
    ...(riskLevel && { riskLevel }),
    exclude: ["page"],
  });

  const {
    fraudEvents,
    loading: isLoading,
    error,
  } = useFraudEvents({
    query: {
      status,
      ...(riskLevel && { riskLevel }),
      sortBy: sortBy as "createdAt" | "riskScore" | "riskLevel",
      sortOrder: sortOrder as "asc" | "desc",
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
    },
  });

  const columns = useMemo(
    () =>
      [
        {
          id: "partner",
          header: "Partner",
          enableHiding: false,
          minSize: 250,
          cell: ({ row }: { row: Row<FraudEventProps> }) => {
            const partner = row.original.partner;
            if (!partner) return "-";
            return (
              <PartnerRowItem
                partner={{
                  id: partner.id,
                  name: partner.name || "Unknown",
                }}
                showPermalink={false}
              />
            );
          },
        },
        {
          id: "flagged",
          header: "Flagged",
          minSize: 150,
          cell: ({ row }: { row: Row<FraudEventProps> }) => (
            <TimestampTooltip
              timestamp={row.original.createdAt}
              side="right"
              rows={["local"]}
              delayDuration={150}
            >
              <span>
                {formatDate(row.original.createdAt, { month: "short" })}
              </span>
            </TimestampTooltip>
          ),
        },
        {
          id: "reasons",
          header: "Reasons",
          minSize: 200,
          cell: ({ row }: { row: Row<FraudEventProps> }) => {
            const reasons = formatTriggeredRules(row.original.triggeredRules);
            return <span className="text-sm text-neutral-600">{reasons}</span>;
          },
        },
        {
          id: "riskLevel",
          header: "Risk Level",
          minSize: 120,
          cell: ({ row }: { row: Row<FraudEventProps> }) => {
            const badge = FRAUD_RISK_LEVEL_BADGES[row.original.riskLevel];
            return (
              <StatusBadge icon={null} variant={badge.variant}>
                {badge.label}
              </StatusBadge>
            );
          },
        },
        {
          id: "status",
          header: "Status",
          minSize: 120,
          cell: ({ row }: { row: Row<FraudEventProps> }) => {
            const badge = FRAUD_EVENT_STATUS_BADGES[row.original.status];
            return (
              <StatusBadge icon={null} variant={badge.variant}>
                {badge.label}
              </StatusBadge>
            );
          },
        },
        {
          id: "riskScore",
          header: "Risk Score",
          minSize: 100,
          accessorFn: (d: FraudEventProps) => d.riskScore.toString(),
        },
        {
          id: "createdAt",
          header: "Created",
          minSize: 150,
          cell: ({ row }: { row: Row<FraudEventProps> }) => (
            <TimestampTooltip
              timestamp={row.original.createdAt}
              side="right"
              rows={["local"]}
              delayDuration={150}
            >
              <span>
                {formatDate(row.original.createdAt, { month: "short" })}
              </span>
            </TimestampTooltip>
          ),
        },
        {
          id: "menu",
          enableHiding: false,
          minSize: 43,
          size: 43,
          maxSize: 43,
          header: ({ table }: { table: any }) => (
            <EditColumnsButton table={table} />
          ),
          cell: ({ row }: { row: Row<FraudEventProps> }) => (
            <RowMenuButton row={row} />
          ),
        },
      ].filter((c) => c.id === "menu" || fraudEventsColumns.all.includes(c.id)),
    [],
  );

  const { table, ...tableProps } = useTable({
    data: fraudEvents || [],
    columns,
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    sortableColumns: ["createdAt", "riskScore", "riskLevel"],
    sortBy,
    sortOrder,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
        },
        del: "page",
        scroll: false,
      }),
    getRowId: (row) => row.id,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: () => "fraud event",
    rowCount: fraudEventsCount ?? 0,
    loading: isLoading,
    error: error || countError ? "Failed to load fraud events" : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        </div>
        <AnimatedSizeContainer height>
          <div>
            {activeFilters.length > 0 && (
              <div className="pt-3">
                <Filter.List
                  filters={filters}
                  activeFilters={activeFilters}
                  onSelect={onSelect}
                  onRemove={onRemove}
                  onRemoveAll={onRemoveAll}
                />
              </div>
            )}
          </div>
        </AnimatedSizeContainer>
      </div>
      {fraudEvents?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No fraud events found"
          description={
            isFiltered
              ? "No fraud events found for the selected filters."
              : "No fraud events have been detected yet."
          }
          cardContent={() => (
            <>
              <ShieldKeyhole className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </div>
  );
}

function RowMenuButton({ row }: { row: Row<FraudEventProps> }) {
  const [isOpen, setIsOpen] = useState(false);
  const event = row.original;
  const { id: workspaceId } = useWorkspace();

  const handleResolve = async (status: "safe" | "banned") => {
    if (!workspaceId) {
      toast.error("Workspace ID is required");
      return;
    }

    try {
      const response = await fetch(
        `/api/fraud-events/${event.id}/resolve?workspaceId=${workspaceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to resolve fraud event");
      }

      toast.success(
        `Fraud event marked as ${status === "safe" ? "safe" : "banned"}`,
      );
      mutatePrefix("/api/fraud-events");
      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to resolve fraud event");
    }
  };

  if (event.status !== "pending") {
    return null;
  }

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[180px]">
            <Command.Group className="p-1.5">
              <MenuItem
                icon={CircleCheck}
                label="Mark as Safe"
                onSelect={() => handleResolve("safe")}
              />
              <MenuItem
                icon={CircleXmark}
                label="Mark as Banned"
                onSelect={() => handleResolve("banned")}
                danger
              />
            </Command.Group>
          </Command.List>
        </Command>
      }
      align="end"
    >
      <Button
        type="button"
        className="h-8 whitespace-nowrap px-2"
        variant="outline"
        icon={<Dots className="h-4 w-4 shrink-0" />}
      />
    </Popover>
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
  danger,
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
        danger
          ? "text-red-600 hover:bg-red-50 focus:bg-red-50"
          : "text-neutral-700 hover:bg-neutral-100 focus:bg-neutral-100"
      } `}
    >
      <IconComp className="h-4 w-4 shrink-0" />
      {label}
    </Command.Item>
  );
}
