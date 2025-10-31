"use client";

import { PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES } from "@/lib/api/bounties/performance-bounty-scope-attributes";
import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import useBounty from "@/lib/swr/use-bounty";
import {
  SubmissionsCountByStatus,
  useBountySubmissionsCount,
} from "@/lib/swr/use-bounty-submissions-count";
import useGroups from "@/lib/swr/use-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountySubmissionProps } from "@/lib/types";
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
  TimestampTooltip,
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
import { BountySubmissionRowMenu } from "./bounty-submission-row-menu";
import { BOUNTY_SUBMISSION_STATUS_BADGES } from "./bounty-submission-status-badges";
import { useBountySubmissionFilters } from "./use-bounty-submission-filters";

export function BountySubmissionsTable() {
  const { bounty, loading: isBountyLoading } = useBounty();
  const { groups } = useGroups();
  const { id: workspaceId } = useWorkspace();
  const { bountyId } = useParams<{ bountyId: string }>();
  const { pagination, setPagination } = usePagination();
  const { queryParams, searchParams, getQueryString } = useRouterStuff();

  // Decide the columns to show based on the bounty type
  const showColumns = useMemo(() => {
    const columns = ["partner", "group", "status", "completedAt", "reviewedAt"];

    if (!bounty) {
      return columns;
    }

    if (bounty.type === "performance") {
      columns.push("performanceMetrics");
    }

    return columns;
  }, [bounty]);

  // Performance based bounty columns
  const performanceCondition = bounty?.performanceCondition;

  const metricColumnLabel = performanceCondition?.attribute
    ? PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES[performanceCondition.attribute]
    : "Progress";

  const sortBy = searchParams.get("sortBy") || "completedAt";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  const { submissionsCount } =
    useBountySubmissionsCount<SubmissionsCountByStatus[]>();

  const { filters, activeFilters, onSelect, onRemove, onRemoveAll } =
    useBountySubmissionFilters({ bounty });

  const {
    error,
    isLoading,
    data: submissions,
  } = useSWR<BountySubmissionProps[]>(
    workspaceId && bountyId
      ? `/api/bounties/${bountyId}/submissions${getQueryString(
          {
            workspaceId,
            sortBy,
            sortOrder,
          },
          { exclude: ["submissionId"] },
        )}`
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

    const submission = submissions?.find((s) => s.id === submissionId);

    if (submission) {
      setDetailsSheetState({ open: true, submission });
    }
  }, [searchParams, submissions]);

  // Navigation functions for the details sheet
  const [previousSubmissionId, nextSubmissionId] = useMemo(() => {
    if (!submissions || !detailsSheetState.submission) return [null, null];

    const currentIndex = submissions.findIndex(
      (s) => s.id === detailsSheetState.submission!.id,
    );

    // if the current submission is not found, return the current details sheet submission id
    // and the first submission id as the previous and next submission ids
    if (currentIndex === -1) return [null, submissions[0].id];

    return [
      currentIndex > 0 ? submissions[currentIndex - 1].id : null,
      currentIndex < submissions.length - 1
        ? submissions[currentIndex + 1].id
        : null,
    ];
  }, [submissions, detailsSheetState.submission]);

  const onNext = nextSubmissionId
    ? () => queryParams({ set: { submissionId: nextSubmissionId } })
    : undefined;
  const onPrevious = previousSubmissionId
    ? () => queryParams({ set: { submissionId: previousSubmissionId } })
    : undefined;

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
                const badge = row.original
                  ? BOUNTY_SUBMISSION_STATUS_BADGES[row.original.status]
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

      ...(showColumns.includes("completedAt")
        ? [
            {
              id: "completedAt",
              header:
                bounty?.type === "performance" ? "Completed" : "Submitted",
              cell: ({ row }) => {
                if (!row.original.completedAt) return "-";

                return (
                  <TimestampTooltip
                    timestamp={row.original.completedAt}
                    side="left"
                    delayDuration={150}
                  >
                    <span>
                      {formatDate(row.original.completedAt, { month: "short" })}
                    </span>
                  </TimestampTooltip>
                );
              },
            },
          ]
        : []),

      ...(showColumns.includes("performanceMetrics")
        ? [
            {
              id: "performanceCount",
              header: capitalize(metricColumnLabel)!,
              cell: ({ row }: { row: Row<BountySubmissionProps> }) => {
                if (!performanceCondition) {
                  return "-";
                }

                const value = row.original.performanceCount ?? 0;
                const attribute = performanceCondition.attribute;
                const target = performanceCondition.value;

                const formattedValue = isCurrencyAttribute(attribute)
                  ? currencyFormatter(value / 100, {
                      trailingZeroDisplay: "stripIfInteger",
                    })
                  : nFormatter(value, { full: true });

                const formattedTarget = isCurrencyAttribute(attribute)
                  ? currencyFormatter(target / 100, {
                      trailingZeroDisplay: "stripIfInteger",
                    })
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
                return row.original.reviewedAt ? (
                  <UserRowItem
                    user={row.original.user!}
                    date={row.original.reviewedAt}
                    label={
                      row.original.status === "approved"
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

      // Menu
      {
        id: "menu",
        enableHiding: false,
        minSize: 43,
        size: 43,
        maxSize: 43,
        cell: ({ row }) => <BountySubmissionRowMenu row={row} />,
      },
    ],
    [
      groups,
      bounty,
      showColumns,
      metricColumnLabel,
      performanceCondition,
      workspaceId,
    ],
  );

  const { table, ...tableProps } = useTable({
    data: submissions || [],
    columns,
    columnPinning: { right: ["menu"] },
    onRowClick: (row) => {
      if (!row.original.id) {
        return;
      }

      queryParams({
        set: {
          submissionId: row.original.id,
        },
        scroll: false,
      });
    },
    sortableColumns: [
      "completedAt",
      ...(bounty?.type === "performance" ? ["performanceCount"] : []),
    ],
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
    resourceName: (p) => `submission${p ? "s" : ""}`,
    // if status is not set, we count submitted and approved submissions
    // else, we count the submissions for the status
    rowCount: searchParams.get("status")
      ? submissionsCount?.find((s) => s.status === searchParams.get("status"))
          ?.count || 0
      : submissionsCount
          ?.filter((s) => s.status === "submitted" || s.status === "approved")
          .reduce((acc, curr) => acc + curr.count, 0) || 0,
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
          onNext={onNext}
          onPrevious={onPrevious}
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
                    onSelect={onSelect}
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
