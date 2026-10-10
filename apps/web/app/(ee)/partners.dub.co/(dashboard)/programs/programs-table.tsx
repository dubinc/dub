"use client";

import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { usePartnerProgramActivity } from "@/lib/swr/use-partner-profile-earnings";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { ProgramEnrollmentProps } from "@/lib/types";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { ProgramInviteActions } from "@/ui/partners/program-invite-actions";
import { ProgramLogo } from "@/ui/partners/program-logo";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import {
  MiniAreaChart,
  StatusBadge,
  Table,
  Tooltip,
  useCopyToClipboard,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Check, Copy } from "@dub/ui/icons";
import { currencyFormatter, formatDate, getPrettyUrl } from "@dub/utils";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { PROGRAMS_TABLE_PAGE_SIZE, ProgramTab } from "./program-tabs";

type ProgramColumn = ColumnDef<ProgramEnrollmentProps>;

export function ProgramsTable({
  tab,
  search,
  count,
  countError,
}: {
  tab: ProgramTab;
  search?: string;
  // the page gets the count, from the status counts or a count request
  count?: number;
  countError?: unknown;
}) {
  const router = useRouter();
  const { searchParams, queryParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination(PROGRAMS_TABLE_PAGE_SIZE);

  const sortBy = searchParams.get("sortBy") === "name" ? "name" : undefined;
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const status = tab.statuses.join(",");

  const { programEnrollments, isLoading, error } = useProgramEnrollments({
    includeRewardsDiscounts: tab.id === "invitations",
    status,
    search,
    ...(sortBy && { sortBy }),
    sortOrder,
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
  });

  const columns = useMemo(() => getColumns(tab), [tab]);

  const { table, ...tableProps } = useTable({
    data: programEnrollments || [],
    columns,
    onRowClick: (row, e) => {
      const url = getProgramUrl(tab, row.original);

      if (e.metaKey || e.ctrlKey) window.open(url, "_blank");
      else router.push(url);
    },
    onRowAuxClick: (row) => window.open(getProgramUrl(tab, row.original)),
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: ["name", "totalCommissions"],
    sortBy: sortBy ?? "totalCommissions",
    sortOrder,
    onSortChange: ({ sortBy: newSortBy, sortOrder: newSortOrder }) =>
      queryParams({
        set: {
          ...(newSortBy && { sortBy: newSortBy }),
          ...(newSortOrder && {
            // the table starts a new column at desc, but names read better
            // A to Z on the first click
            sortOrder:
              newSortBy === "name" && sortBy !== "name" ? "asc" : newSortOrder,
          }),
        },
        del: "page",
      }),
    containerClassName: "border-none",
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `${tab.resourceName}${plural ? "s" : ""}`,
    rowCount: count ?? 0,
    loading: isLoading,
    error: error || countError ? "Failed to load programs" : undefined,
  });

  return <Table {...tableProps} table={table} />;
}

function getProgramUrl(tab: ProgramTab, { program }: ProgramEnrollmentProps) {
  return tab.id === "invitations"
    ? `/programs/${program.slug}/invite`
    : `/programs/${program.slug}`;
}

function getColumns(tab: ProgramTab): ProgramColumn[] {
  const programColumn: ProgramColumn = {
    id: "name",
    header: "Program",
    size: 200,
    minSize: 160,
    cell: ({ row }) => <ProgramName program={row.original.program} />,
  };

  const earningsColumn: ProgramColumn = {
    id: "totalCommissions",
    header: "Earnings",
    size: 120,
    cell: ({ row }) => currencyFormatter(row.original.totalCommissions),
  };

  switch (tab.id) {
    case "active":
      return [
        programColumn,
        {
          id: "link",
          header: "Links",
          minSize: 200,
          cell: ({ row }) => (
            <ProgramLinkChip programEnrollment={row.original} />
          ),
        },
        {
          id: "activity",
          header: "Earnings (last 12 months)",
          size: 180,
          cell: ({ row }) => (
            <ProgramActivity programEnrollment={row.original} />
          ),
        },
        earningsColumn,
      ];
    case "invitations":
      return [
        programColumn,
        {
          id: "createdAt",
          header: "Invited date",
          size: 140,
          cell: ({ row }) =>
            formatDate(row.original.createdAt, { month: "short" }),
        },
        {
          id: "rewards",
          header: "Rewards",
          minSize: 160,
          cell: ({ row }) => (
            <span className="truncate">
              <ProgramRewardDescription
                reward={row.original.rewards?.[0]}
                amountClassName="font-normal"
                periodClassName="font-normal"
              />
            </span>
          ),
        },
        {
          id: "actions",
          header: "",
          size: 210,
          minSize: 210,
          cell: ({ row }) => (
            <ProgramInviteActions
              programEnrollment={row.original}
              className="ml-auto flex w-fit"
              buttonClassName="h-7 w-auto whitespace-nowrap px-2.5 text-xs"
            />
          ),
        },
      ];
    case "applications":
      return [
        programColumn,
        {
          id: "createdAt",
          header: "Application date",
          size: 160,
          cell: ({ row }) =>
            formatDate(row.original.createdAt, { month: "short" }),
        },
        {
          id: "status",
          header: "Status",
          size: 160,
          cell: ({ row }) => (
            <EnrollmentStatusBadge status={row.original.status} />
          ),
        },
      ];
    case "inactive":
      return [
        programColumn,
        {
          id: "status",
          header: "Status",
          size: 160,
          cell: ({ row }) => (
            <EnrollmentStatusBadge status={row.original.status} />
          ),
        },
        earningsColumn,
      ];
  }
}

function ProgramName({
  program,
}: {
  program: ProgramEnrollmentProps["program"];
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <ProgramLogo program={program} />
      <span className="truncate font-medium text-neutral-800">
        {program.name}
      </span>
    </div>
  );
}

function EnrollmentStatusBadge({
  status,
}: {
  status: ProgramEnrollmentProps["status"];
}) {
  const badge = PartnerStatusBadges[status];

  return (
    <StatusBadge variant={badge.variant} icon={null}>
      {badge.label}
    </StatusBadge>
  );
}

function ProgramLinkChip({
  programEnrollment,
}: {
  programEnrollment: ProgramEnrollmentProps;
}) {
  const { group } = programEnrollment;
  const link = programEnrollment.links?.[0];
  const [copied, copyToClipboard] = useCopyToClipboard();

  if (!link) {
    return <span className="text-neutral-400">No link</span>;
  }

  const partnerLink = constructPartnerLink({ group, link });

  return (
    <div className="-ml-1.5 flex w-fit max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-neutral-100">
      <Tooltip
        content={copied ? "Copied" : "Copy link"}
        disableHoverableContent
      >
        <button
          type="button"
          className="flex min-w-0 items-center gap-1.5 text-neutral-700"
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(partnerLink);
          }}
        >
          <span className="truncate">{getPrettyUrl(partnerLink)}</span>
          {copied ? (
            <Check className="size-3.5 shrink-0" />
          ) : (
            <Copy className="size-3.5 shrink-0" />
          )}
        </button>
      </Tooltip>
    </div>
  );
}

function ProgramActivity({
  programEnrollment,
}: {
  programEnrollment: ProgramEnrollmentProps;
}) {
  const data = usePartnerProgramActivity(programEnrollment.programId);

  return (
    <Tooltip content="View last 12 months earnings">
      <Link
        href={`/programs/${programEnrollment.program.slug}/earnings?interval=1y`}
        onClick={(e) => e.stopPropagation()}
        className="-ml-1.5 block w-fit rounded-md px-1.5 py-0.5 transition-colors hover:bg-neutral-100"
      >
        <div className="h-6 w-36">
          {data && (
            <MiniAreaChart data={data} padding={{ top: 4, bottom: 2 }} fadeIn />
          )}
        </div>
      </Link>
    </Tooltip>
  );
}
