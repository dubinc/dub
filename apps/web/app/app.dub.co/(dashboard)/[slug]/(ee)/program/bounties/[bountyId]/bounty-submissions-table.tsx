"use client";

import { approveBountySubmissionAction } from "@/lib/actions/partners/approve-bounty-submission";
import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useBounty from "@/lib/swr/use-bounty";
import useGroups from "@/lib/swr/use-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountySubmissionProps } from "@/lib/types";
import { WORKFLOW_ATTRIBUTE_LABELS } from "@/lib/zod/schemas/workflows";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { useRejectBountySubmissionModal } from "@/ui/partners/reject-bounty-submission-modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { X } from "@/ui/shared/icons";
import { UserRowItem } from "@/ui/users/user-row-item";
import {
  AnimatedSizeContainer,
  Button,
  Filter,
  Popover,
  ProgressCircle,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import type { Icon } from "@dub/ui/icons";
import { Check, Dots, MoneyBill2, User } from "@dub/ui/icons";
import {
  capitalize,
  cn,
  currencyFormatter,
  fetcher,
  formatDate,
  nFormatter,
} from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useAction } from "next-safe-action/hooks";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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

  const sortBy = searchParams.get("sortBy") || "createdAt";
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
                  ? currencyFormatter(value / 100, {
                      maximumFractionDigits: 2,
                    })
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
      {
        id: "menu",
        enableHiding: false,
        minSize: 43,
        size: 43,
        maxSize: 43,
        cell: ({ row }) => (
          <RowMenuButton row={row} workspaceId={workspaceId!} />
        ),
      },
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
    resourceName: (p) => `submission${p ? "s" : ""}`,
    rowCount: submissions?.length || 0,
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

function RowMenuButton({
  row,
  workspaceId,
}: {
  row: Row<BountySubmissionProps>;
  workspaceId: string;
}) {
  const router = useRouter();
  const { slug, bountyId } = useParams();
  const [isOpen, setIsOpen] = useState(false);

  const { setShowRejectModal, RejectBountySubmissionModal } =
    useRejectBountySubmissionModal(row.original.submission);

  const { executeAsync: approveBountySubmission } = useAction(
    approveBountySubmissionAction,
    {
      onSuccess: async () => {
        toast.success("Bounty submission approved successfully!");
        setIsOpen(false);
        await mutatePrefix(`/api/bounties/${bountyId}/submissions`);
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const {
    setShowConfirmModal: setShowApproveBountySubmissionModal,
    confirmModal: approveBountySubmissionModal,
  } = useConfirmModal({
    title: "Approve Bounty Submission",
    description: "Are you sure you want to approve this bounty submission?",
    confirmText: "Approve",
    onConfirm: async () => {
      if (!workspaceId || !row.original.submission?.id) {
        return;
      }

      await approveBountySubmission({
        workspaceId,
        submissionId: row.original.submission.id,
      });
    },
  });

  const submission = row.original.submission;
  const commission = row.original.commission;

  if (submission?.status !== "pending" || !commission) {
    return null;
  }

  return (
    <>
      <RejectBountySubmissionModal />
      {approveBountySubmissionModal}
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
              {submission?.status === "pending" && (
                <MenuItem
                  icon={Check}
                  label="Accept bounty"
                  onSelect={() => {
                    setShowApproveBountySubmissionModal(true);
                    setIsOpen(false);
                  }}
                />
              )}

              {submission?.status === "pending" && (
                <MenuItem
                  icon={X}
                  label="Reject bounty"
                  variant="danger"
                  onSelect={() => {
                    setShowRejectModal(true);
                    setIsOpen(false);
                  }}
                />
              )}

              {commission && (
                <MenuItem
                  icon={MoneyBill2}
                  label="View commission"
                  onSelect={() => {
                    router.push(
                      `/${slug}/program/commissions?commissionId=${commission.id}&interval=all`,
                    );
                    setIsOpen(false);
                  }}
                />
              )}
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
    </>
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
  variant = "default",
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
  variant?: "default" | "danger";
}) {
  const variantStyles = {
    default: {
      text: "text-neutral-600",
      icon: "text-neutral-500",
    },
    danger: {
      text: "text-red-600",
      icon: "text-red-600",
    },
  };

  const { text, icon } = variantStyles[variant];

  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm",
        "data-[selected=true]:bg-neutral-100",
        text,
      )}
      onSelect={onSelect}
    >
      <IconComp className={cn("size-4 shrink-0", icon)} />
      {label}
    </Command.Item>
  );
}
