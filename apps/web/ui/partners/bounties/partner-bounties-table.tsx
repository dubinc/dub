"use client";

import { getBountyRewardAmount } from "@/lib/bounty/rewards";
import { PartnerBountyProps } from "@/lib/types";
import { Table, useTable, useTablePagination } from "@dub/ui";
import { currencyFormatter, formatDate } from "@dub/utils";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BountyIncrementalBonusTooltip } from "./bounty-incremental-bonus-tooltip";
import {
  PerformanceBountyProgress,
  SubmissionBountyProgress,
} from "./bounty-performance";
import { BountyThumbnailImage } from "./bounty-thumbnail-image";

const PAGE_SIZE = 10;

type SortBy = "endsAt" | "rewardAmount";

// sort values: bounties without an end date expire last, and bounties without an amount earn least
const SORT_VALUES: Record<SortBy, (bounty: PartnerBountyProps) => number> = {
  endsAt: (bounty) =>
    bounty.endsAt ? new Date(bounty.endsAt).getTime() : Infinity,
  rewardAmount: (bounty) => getBountyRewardAmount(bounty)?.amount ?? 0,
};

const COLUMNS: ColumnDef<PartnerBountyProps>[] = [
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
        <PerformanceBountyProgress bounty={row.original} hideBar />
      ) : (
        <SubmissionBountyProgress
          bounty={row.original}
          className="flex-row"
          hideBar
        />
      ),
  },
  {
    id: "rewardAmount",
    header: "Earnings",
    size: 160,
    cell: ({ row }) => <BountyEarnings bounty={row.original} />,
  },
];

// the compact list view of the partner bounties. The page loads every bounty, so the table sorts and pages them here
export function PartnerBountiesTable({
  bounties,
  isLoading,
  getHref,
  resourceName,
}: {
  bounties?: PartnerBountyProps[];
  isLoading?: boolean;
  getHref: (bounty: PartnerBountyProps) => string;
  resourceName: (plural: boolean) => string;
}) {
  const router = useRouter();

  const [sort, setSort] = useState<{
    sortBy: SortBy;
    sortOrder: "asc" | "desc";
  }>({ sortBy: "endsAt", sortOrder: "asc" });

  const { pagination, setPagination } = useTablePagination({
    pageSize: PAGE_SIZE,
    page: 1,
  });

  // compute each sort value once per bounty, not once per comparison
  const sortedBounties = useMemo(() => {
    const getValue = SORT_VALUES[sort.sortBy];
    const direction = sort.sortOrder === "asc" ? 1 : -1;

    return (bounties ?? [])
      .map((bounty) => ({ bounty, value: getValue(bounty) }))
      .sort((a, b) => {
        const diff = a.value - b.value;
        // two bounties without an end date give Infinity - Infinity
        return (Number.isNaN(diff) ? 0 : diff) * direction;
      })
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

  const { table, ...tableProps } = useTable({
    data: pageBounties,
    columns: COLUMNS,
    onRowClick: (row, e) => {
      const href = getHref(row.original);

      if (e.metaKey || e.ctrlKey) window.open(href, "_blank");
      else router.push(href);
    },
    onRowAuxClick: (row) => window.open(getHref(row.original)),
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: ["endsAt", "rewardAmount"],
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
    onSortChange: ({ sortBy, sortOrder }) => {
      setSort((current) => ({
        sortBy: (sortBy as SortBy | undefined) ?? current.sortBy,
        sortOrder: sortOrder ?? current.sortOrder,
      }));
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
    ? `${reward.isMaximum ? "Up to " : ""}${currencyFormatter(reward.amount, {
        trailingZeroDisplay: "stripIfInteger",
      })}`
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
