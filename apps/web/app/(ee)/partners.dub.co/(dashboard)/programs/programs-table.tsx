"use client";

import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { usePartnerProgramActivity } from "@/lib/swr/use-partner-profile-earnings";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import useProgramEnrollmentsCount from "@/lib/swr/use-program-enrollments-count";
import { ProgramEnrollmentProps } from "@/lib/types";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { ProgramInviteActions } from "@/ui/partners/program-invite-actions";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import {
  BlurImage,
  MiniAreaChart,
  StatusBadge,
  Table,
  Tooltip,
  useCopyToClipboard,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { ChartLine, Check, Copy, Link4 } from "@dub/ui/icons";
import {
  cn,
  currencyFormatter,
  formatDate,
  getPrettyUrl,
  OG_AVATAR_URL,
} from "@dub/utils";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { PROGRAMS_TABLE_PAGE_SIZE, ProgramTab } from "./program-tabs";

type ProgramColumn = ColumnDef<ProgramEnrollmentProps>;

export function ProgramsTable({
  tab,
  search,
}: {
  tab: ProgramTab;
  search?: string;
}) {
  const router = useRouter();
  const { searchParams, queryParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination(PROGRAMS_TABLE_PAGE_SIZE);

  const sortBy = searchParams.get("sortBy") === "name" ? "name" : undefined;
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const status = tab.statuses.join(",");

  const { programEnrollments, isLoading, error } = useProgramEnrollments({
    ...(tab.id === "invitations" && { includeRewardsDiscounts: true }),
    status,
    search,
    ...(sortBy && { sortBy }),
    sortOrder,
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
  });

  const { count, error: countError } = useProgramEnrollmentsCount({
    status,
    search,
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
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
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
          header: "Activity",
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
      <BlurImage
        width={40}
        height={40}
        src={program.logo || `${OG_AVATAR_URL}${program.name}`}
        alt={program.name}
        className="size-5 shrink-0 rounded-full border border-black/10"
      />
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

// the partner's default link: click to copy, or open its analytics
function ProgramLinkChip({
  programEnrollment,
}: {
  programEnrollment: ProgramEnrollmentProps;
}) {
  const { program, group } = programEnrollment;
  const link = programEnrollment.links?.[0];
  const [copied, copyToClipboard] = useCopyToClipboard();

  if (!link) {
    return <span className="text-neutral-400">No link</span>;
  }

  const partnerLink = constructPartnerLink({ group, link });

  return (
    <div className="group/chip flex w-fit max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-neutral-100">
      <button
        type="button"
        className="flex min-w-0 items-center gap-1.5 text-neutral-700"
        onClick={(e) => {
          e.stopPropagation();
          copyToClipboard(partnerLink);
        }}
      >
        <Link4 className="size-3.5 shrink-0" />
        <span className="truncate">{getPrettyUrl(partnerLink)}</span>
        {copied ? (
          <Check className="size-3.5 shrink-0" />
        ) : (
          <Copy className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/chip:opacity-100" />
        )}
      </button>
      <Tooltip content="View analytics">
        <Link
          href={`/programs/${program.slug}/analytics?linkId=${link.id}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "shrink-0 rounded p-0.5 text-neutral-500 opacity-0 transition-opacity hover:text-neutral-800 group-hover/chip:opacity-100",
          )}
        >
          <ChartLine className="size-3.5" />
        </Link>
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
    <div className="h-6 w-36">
      {data && (
        <MiniAreaChart data={data} padding={{ top: 2, bottom: 2 }} fadeIn />
      )}
    </div>
  );
}
