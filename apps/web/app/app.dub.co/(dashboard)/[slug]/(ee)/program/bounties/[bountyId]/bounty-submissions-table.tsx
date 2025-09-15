"use client";

import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import useBounty from "@/lib/swr/use-bounty";
import useGroups from "@/lib/swr/use-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountySubmissionProps } from "@/lib/types";
import { WORKFLOW_ATTRIBUTE_LABELS } from "@/lib/zod/schemas/workflows";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { UserRowItem } from "@/ui/users/user-row-item";
import {
  AnimatedSizeContainer,
  Filter,
  ProgressCircle,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { MoneyBill2, User } from "@dub/ui/icons";
import {
  capitalize,
  currencyFormatter,
  fetcher,
  formatDate,
  nFormatter,
} from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { BountySubmissionDetailsSheet } from "./bounty-submission-details-sheet";
import { BOUNTY_SUBMISSION_STATUS_BADGES } from "./bounty-submission-status-badges";
import { useBountySubmissionFilters } from "./use-bounty-submission-filters";

const PERFORMANCE_ATTRIBUTE_TO_SORTABLE_COLUMNS = {
  totalLeads: "leads",
  totalConversions: "conversions",
  totalSaleAmount: "saleAmount",
  totalCommissions: "commissions",
} as const;

export function BountySubmissionsTable() {
  const { bounty, loading: isBountyLoading } = useBounty();
  const { groups } = useGroups();
  const { id: workspaceId } = useWorkspace();
  const { bountyId } = useParams<{ bountyId: string }>();
  const { pagination, setPagination } = usePagination();
  const { queryParams, searchParams, getQueryString } = useRouterStuff();

  // Decide the columns to show based on the bounty type
  const showColumns = useMemo(() => {
    const columns = ["partner", "group", "createdAt"];

    if (!bounty) {
      return columns;
    }

    if (bounty.type === "submission") {
      columns.push(...["status", "reviewedAt"]);
    } else if (bounty.type === "performance") {
      columns.push(...["performanceMetrics"]);
    }

    return columns;
  }, [bounty]);

  // Performance based bounty columns
  const performanceCondition = bounty?.performanceCondition;

  const metricColumnId = performanceCondition?.attribute
    ? PERFORMANCE_ATTRIBUTE_TO_SORTABLE_COLUMNS[performanceCondition.attribute]
    : "leads";

  const metricColumnLabel = performanceCondition?.attribute
    ? WORKFLOW_ATTRIBUTE_LABELS[performanceCondition.attribute]
    : "Progress";

  const sortBy =
    searchParams.get("sortBy") || bounty?.type === "performance"
      ? metricColumnId
      : "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const { filters, activeFilters, onSelect, onRemove, onRemoveAll } =
    useBountySubmissionFilters({ bounty });

  const {
    error,
    isLoading,
    data: submissions,
  } = useSWR<BountySubmissionProps[]>(
    workspaceId && bountyId
      ? `/api/bounties/${bountyId}/submissions${getQueryString({
          workspaceId,
          sortBy,
        })}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
      dedupingInterval: 30000,
    },
  );

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; submission: BountySubmissionProps | null }
    | { open: true; submission: BountySubmissionProps }
  >({ open: false, submission: null });

  // Open the details sheet if submissionId is set in params
  useEffect(() => {
    const submissionId = searchParams.get("submissionId");

    if (!submissionId) {
      setDetailsSheetState({ open: false, submission: null });
    }

    const submission = submissions?.find(
      (s) => s.submission?.id === submissionId,
    );

    if (submission?.submission) {
      setDetailsSheetState({ open: true, submission });
    }
  }, [searchParams, submissions]);

  const columns = useMemo(
    () => [
      {
        id: "partner",
        header: "Partner",
        minSize: 250,
        cell: ({ row }) => {
          return <PartnerRowItem partner={row.original.partner} />;
        },
      },
      {
        id: "group",
        header: "Group",
        cell: ({ row }) => {
          if (!groups) return "-";

          const group = groups.find(
            (g) => g.id === row.original.partner.groupId,
          );

          if (!group) return "-";

          return (
            <div className="flex items-center gap-2">
              <GroupColorCircle group={group} />
              <span className="truncate text-sm font-medium">{group.name}</span>
            </div>
          );
        },
      },

      ...(showColumns.includes("status")
        ? [
            {
              id: "status",
              header: "Status",
              cell: ({ row }) => {
                const badge = row.original.submission
                  ? BOUNTY_SUBMISSION_STATUS_BADGES[
                      row.original.submission.status
                    ]
                  : null;

                return badge ? (
                  <StatusBadge icon={null} variant={badge.variant}>
                    {badge.label}
                  </StatusBadge>
                ) : (
                  "-"
                );
              },
            },
          ]
        : []),

      {
        id: "createdAt",
        header: bounty?.type === "submission" ? "Submitted" : "Completed",
        accessorFn: (d) =>
          d.submission
            ? formatDate(d.submission.createdAt, { month: "short" })
            : "-",
      },

      // TODO: fix this
      ...(showColumns.includes("performanceMetrics")
        ? [
            {
              id: metricColumnId,
              header: capitalize(metricColumnLabel)!,
              cell: ({ row }: { row: Row<BountySubmissionProps> }) => {
                if (!performanceCondition) {
                  return "-";
                }

                const attribute = performanceCondition.attribute;
                const target = performanceCondition.value;
                let value: number | undefined = undefined;

                if (attribute === "totalLeads") {
                  value = row.original.partner.leads;
                } else if (attribute === "totalConversions") {
                  value = row.original.partner.conversions;
                } else if (attribute === "totalSaleAmount") {
                  value = row.original.partner.saleAmount;
                } else if (attribute === "totalCommissions") {
                  value = row.original.partner.totalCommissions;
                }

                if (value === undefined) {
                  return "-";
                }

                const formattedValue = isCurrencyAttribute(attribute)
                  ? currencyFormatter(value / 100)
                  : nFormatter(value, { full: true });

                const formattedTarget = isCurrencyAttribute(attribute)
                  ? currencyFormatter(target / 100)
                  : nFormatter(target, { full: true });

                return (
                  <div className="flex items-center gap-2">
                    <ProgressCircle progress={value / target} />
                    <span className="min-w-0 text-sm font-medium leading-5 text-neutral-600">
                      {formattedValue} / {formattedTarget}
                    </span>
                  </div>
                );
              },
            },
          ]
        : []),

      ...(showColumns.includes("reviewedAt")
        ? [
            {
              id: "reviewedAt",
              header: "Reviewed",
              cell: ({ row }) => {
                return row.original.submission?.reviewedAt ? (
                  <UserRowItem
                    user={row.original.user!}
                    date={row.original.submission?.reviewedAt}
                    label={
                      row.original.submission?.status === "approved"
                        ? "Approved at"
                        : "Rejected at"
                    }
                  />
                ) : (
                  "-"
                );
              },
            },
          ]
        : []),
    ],
    [
      groups,
      bounty,
      showColumns,
      metricColumnId,
      metricColumnLabel,
      performanceCondition,
      workspaceId,
    ],
  );

  const { table, ...tableProps } = useTable({
    data: submissions || [],
    columns,
    onRowClick: (row) => {
      if (!row.original.submission) {
        return;
      }

      queryParams({
        set: {
          submissionId: row.original.submission.id,
        },
        scroll: false,
      });
    },
    sortableColumns:
      bounty?.type === "submission"
        ? ["createdAt"]
        : ["createdAt", "leads", "conversions", "saleAmount", "commissions"],
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
    pagination,
    onPaginationChange: setPagination,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) =>
      `${bounty?.type === "performance" ? "partner" : "submission"}${p ? "s" : ""}`,
    rowCount:
      bounty?.type === "performance"
        ? bounty.partnersCount
        : submissions?.length || 0,
    loading: isLoading || isBountyLoading,
    error: error ? "Failed to load bounty submissions" : undefined,
  });

  return (
    <>
      {detailsSheetState.submission && (
        <BountySubmissionDetailsSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          submission={detailsSheetState.submission}
        />
      )}

      <div className="flex flex-col gap-6">
        <div>
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
          <AnimatedSizeContainer height>
            <div>
              {activeFilters.length > 0 && (
                <div className="pt-3">
                  <Filter.List
                    filters={[
                      ...filters,
                      {
                        key: "payoutId",
                        icon: MoneyBill2,
                        label: "Payout",
                        options: [],
                      },
                    ]}
                    activeFilters={activeFilters}
                    onRemove={onRemove}
                    onRemoveAll={onRemoveAll}
                  />
                </div>
              )}
            </div>
          </AnimatedSizeContainer>
        </div>
        {submissions?.length !== 0 || isLoading ? (
          <Table {...tableProps} table={table} />
        ) : (
          <AnimatedEmptyState
            title="No submissions found"
            description="No submissions have been made for this bounty yet."
            cardContent={() => (
              <>
                <User className="size-4 text-neutral-700" />
                <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              </>
            )}
          />
        )}
      </div>
    </>
  );
}
