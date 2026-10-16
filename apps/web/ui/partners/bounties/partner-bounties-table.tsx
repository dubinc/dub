"use client";

import {
  formatBountyRewardAmount,
  getBountyRewardAmount,
} from "@/lib/bounty/rewards";
import { PartnerBountyProps, ProgramProps } from "@/lib/types";
import { Table, useTable, useTablePagination } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ProgramLogo } from "../program-logo";
import { BountyIncrementalBonusTooltip } from "./bounty-incremental-bonus-tooltip";
import {
  PerformanceBountyProgress,
  SubmissionBountyProgress,
} from "./bounty-performance";
import { BountyThumbnailImage } from "./bounty-thumbnail-image";

// the program is only set on the bounties of all programs
export type PartnerBountyRow = PartnerBountyProps & {
  program?: Pick<ProgramProps, "name" | "logo">;
};

type SortBy = "program" | "endsAt" | "rewardAmount";

// sort values: bounties without an end date expire last, and bounties without an amount earn least
const SORT_VALUES: Record<
  SortBy,
  (bounty: PartnerBountyRow) => number | string
> = {
  program: (bounty) => bounty.program?.name ?? "",
  endsAt: (bounty) =>
    bounty.endsAt ? new Date(bounty.endsAt).getTime() : Infinity,
  rewardAmount: (bounty) => getBountyRewardAmount(bounty)?.amount ?? 0,
};

function compareSortValues(a: number | string, b: number | string) {
  if (typeof a === "string" || typeof b === "string") {
    return String(a).localeCompare(String(b));
  }

  const diff = a - b;
  // two bounties without an end date give Infinity - Infinity
  return Number.isNaN(diff) ? 0 : diff;
}

const PROGRAM_COLUMN: ColumnDef<PartnerBountyRow> = {
  id: "program",
  header: "Program",
  minSize: 160,
  cell: ({ row }) =>
    row.original.program ? (
      <div className="flex min-w-0 items-center gap-2">
        <ProgramLogo program={row.original.program} />
        <span className="truncate font-medium text-neutral-800">
          {row.original.program.name}
        </span>
      </div>
    ) : (
      "-"
    ),
};

const COLUMNS: ColumnDef<PartnerBountyRow>[] = [
  {
    id: "name",
    header: "Bounty",
    minSize: 240,
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        <div className="bg-bg-subtle flex size-6 shrink-0 items-center justify-center rounded-md p-1">
          <BountyThumbnailImage bounty={row.original} />
        </div>
        <span className="truncate font-medium text-neutral-800">
          {row.original.name}
        </span>
      </div>
    ),
  },
  {
    id: "endsAt",
    header: "Expires",
    size: 140,
    cell: ({ row }) =>
      row.original.endsAt
        ? formatDate(row.original.endsAt, { month: "short" })
        : "-",
  },
  {
    id: "progress",
    header: "Progress",
    minSize: 240,
    cell: ({ row }) =>
      row.original.type === "performance" ? (
        <PerformanceBountyProgress bounty={row.original} variant="circle" />
      ) : (
        <SubmissionBountyProgress
          bounty={row.original}
          className="flex-row"
          variant="circle"
        />
      ),
  },
  {
    id: "rewardAmount",
    header: "Reward",
    size: 160,
    cell: ({ row }) => <BountyEarnings bounty={row.original} />,
  },
];

// the compact list view of the partner bounties. The page loads every bounty, so the table sorts and pages them here
export function PartnerBountiesTable<T extends PartnerBountyRow>({
  bounties,
  isLoading,
  getHref,
  resourceName,
  showProgram = false,
}: {
  bounties?: T[];
  isLoading?: boolean;
  getHref: (bounty: T) => string;
  resourceName: (plural: boolean) => string;
  showProgram?: boolean;
}) {
  const router = useRouter();

  const [sort, setSort] = useState<{
    sortBy: SortBy;
    sortOrder: "asc" | "desc";
  }>({ sortBy: "endsAt", sortOrder: "asc" });

  const { pagination, setPagination } = useTablePagination({
    pageSize: 50,
    page: 1,
  });

  // compute each sort value once per bounty, not once per comparison
  const sortedBounties = useMemo(() => {
    const getValue = SORT_VALUES[sort.sortBy];
    const direction = sort.sortOrder === "asc" ? 1 : -1;

    return (bounties ?? [])
      .map((bounty) => ({ bounty, value: getValue(bounty) }))
      .sort((a, b) => compareSortValues(a.value, b.value) * direction)
      .map(({ bounty }) => bounty);
  }, [bounties, sort]);

  const pageBounties = useMemo(
    () =>
      sortedBounties.slice(
        (pagination.pageIndex - 1) * pagination.pageSize,
        pagination.pageIndex * pagination.pageSize,
      ),
    [sortedBounties, pagination],
  );

  const columns = useMemo(
    () =>
      (showProgram ? [PROGRAM_COLUMN, ...COLUMNS] : COLUMNS) as ColumnDef<T>[],
    [showProgram],
  );

  const { table, ...tableProps } = useTable({
    data: pageBounties,
    columns,
    onRowClick: (row, e) => {
      const href = getHref(row.original);

      if (e.metaKey || e.ctrlKey) window.open(href, "_blank");
      else router.push(href);
    },
    onRowAuxClick: (row) => window.open(getHref(row.original)),
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: [
      ...(showProgram ? ["program"] : []),
      "endsAt",
      "rewardAmount",
    ],
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
    onSortChange: ({ sortBy, sortOrder }) => {
      setSort((current) => {
        const newSortBy = (sortBy as SortBy | undefined) ?? current.sortBy;

        return {
          sortBy: newSortBy,
          // the table starts a new column at desc, but names read better A to Z on the first click
          sortOrder:
            newSortBy === "program" && current.sortBy !== "program"
              ? "asc"
              : sortOrder ?? current.sortOrder,
        };
      });
      setPagination((current) => ({ ...current, pageIndex: 1 }));
    },
    containerClassName: "border-none",
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName,
    rowCount: bounties?.length ?? 0,
    loading: isLoading,
  });

  return <Table {...tableProps} table={table} />;
}

function BountyEarnings({ bounty }: { bounty: PartnerBountyProps }) {
  const reward = getBountyRewardAmount(bounty);

  const label = reward
    ? formatBountyRewardAmount(reward)
    : bounty.rewardDescription || "-";

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="truncate">{label}</span>
      <BountyIncrementalBonusTooltip
        bounty={bounty}
        onTooltipClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
