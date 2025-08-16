"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { BountySubmissionProps } from "@/lib/types";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { BountySubmissionDetailsSheet } from "./bounty-submission-details-sheet";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { UserRowItem } from "@/ui/users/user-row-item";
import {
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { User } from "@dub/ui/icons";
import { fetcher, formatDate } from "@dub/utils";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";

export const BOUNTY_SUBMISSION_STATUS_BADGES = {
  pending: {
    label: "Pending",
    variant: "new",
  },
  approved: {
    label: "Approved",
    variant: "success",
  },
  rejected: {
    label: "Rejected",
    variant: "error",
  },
} as const;

export function BountySubmissionsTable() {
  const { id: workspaceId } = useWorkspace();
  const { bountyId } = useParams<{ bountyId: string }>();
  const { pagination, setPagination } = usePagination();
  const { queryParams, searchParams } = useRouterStuff();

  const {
    error,
    isLoading,
    data: submissions,
  } = useSWR<BountySubmissionProps[]>(
    workspaceId && bountyId
      ? `/api/bounties/${bountyId}/submissions?${new URLSearchParams({
          workspaceId,
        }).toString()}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
      dedupingInterval: 30000,
    },
  );

  const sortBy = searchParams.get("sortBy") || "saleAmount";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

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
  }, [searchParams]);

  const { table, ...tableProps } = useTable({
    data: submissions || [],
    columns: [
      {
        id: "partner",
        header: "Partner",
        minSize: 250,
        cell: ({ row }) => {
          return (
            <PartnerRowItem
              partner={row.original.partner}
              showPermalink={false}
            />
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const badge = BOUNTY_SUBMISSION_STATUS_BADGES[row.original.status];

          return badge ? (
            <StatusBadge icon={null} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          ) : (
            "-"
          );
        },
      },
      {
        id: "createdAt",
        header: "Submitted",
        accessorFn: (d) => formatDate(d.createdAt, { month: "short" }),
      },
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
    ],
    onRowClick: (row) => {
      queryParams({
        set: {
          submissionId: row.original.id,
        },
        scroll: false,
      });
    },
    sortableColumns: ["createdAt"],
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
    rowCount: submissions?.length || 0,
    loading: isLoading,
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
        {submissions && submissions.length > 0 ? (
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
