import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { useFraudGroups } from "@/lib/swr/use-fraud-groups";
import { FraudGroupProps } from "@/lib/types";
import { UserRowItem } from "@/ui/users/user-row-item";
import {
  Badge,
  buttonVariants,
  LoadingSpinner,
  Table,
  Tooltip,
  useTable,
} from "@dub/ui";
import { cn, formatDate } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import Link from "next/link";

const RESOLVED_FRAUD_GROUP_PAGE_SIZE = 10;

export function ResolvedFraudGroupTable({ partnerId }: { partnerId: string }) {
  const {
    fraudGroups,
    loading: fraudGroupsLoading,
    error: fraudGroupsError,
  } = useFraudGroups({
    query: {
      status: "resolved",
      partnerId,
      page: 1,
      pageSize: RESOLVED_FRAUD_GROUP_PAGE_SIZE,
      sortBy: "resolvedAt",
    },
    exclude: ["groupId"],
  });

  const table = useTable<FraudGroupProps>({
    data: fraudGroups || [],
    columns: [
      {
        id: "type",
        header: "Event",
        cell: ({ row }: { row: Row<FraudGroupProps> }) => {
          const reason = FRAUD_RULES_BY_TYPE[row.original.type];
          const count = row.original.eventCount ?? 1;

          if (reason) {
            return (
              <div className="flex items-center gap-2">
                <Tooltip content={reason.description}>
                  <span
                    className={cn(
                      "cursor-help truncate underline decoration-dotted underline-offset-2",
                    )}
                  >
                    {reason.name}
                  </span>
                </Tooltip>

                {count > 1 && (
                  <Badge
                    variant="gray"
                    className="shrink-0 rounded-md border-none px-1.5 py-1 text-xs font-semibold text-neutral-700"
                  >
                    +{Number(count) - 1}
                  </Badge>
                )}
              </div>
            );
          }
        },
      },
      {
        id: "resolvedAt",
        header: "Resolved on",
        cell: ({ row }: { row: Row<FraudGroupProps> }) => {
          const user = row.original.user;
          const resolvedAt = row.original.resolvedAt;

          if (!resolvedAt) return "-";

          if (!user)
            return formatDate(resolvedAt, {
              month: "short",
              year: undefined,
            });

          return (
            <UserRowItem user={user} date={resolvedAt} label="Resolved at" />
          );
        },
      },
      {
        id: "resolutionReason",
        header: "Note",
        cell: ({ row }: { row: Row<FraudGroupProps> }) => {
          const resolutionReason = row.original.resolutionReason;

          if (!resolutionReason) return "-";

          return (
            <Tooltip content={resolutionReason}>
              <span className="line-clamp-1 cursor-help truncate">
                {resolutionReason}
              </span>
            </Tooltip>
          );
        },
      },
    ],
    loading: fraudGroupsLoading,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-0",
    error: fraudGroupsError
      ? "Failed to load resolved fraud events"
      : undefined,
  });

  const displayViewAll =
    fraudGroups?.length &&
    fraudGroups.length === RESOLVED_FRAUD_GROUP_PAGE_SIZE;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <h3 className="text-content-emphasis font-semibold">Resolved events</h3>
        {displayViewAll ? (
          <Link
            href={`/${"workspaceSlug"}/program/fraud/resolved?partnerId=${partnerId}`}
            target="_blank"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex h-7 items-center rounded-lg border px-2 text-sm",
            )}
          >
            View all
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {fraudGroups?.length ? (
          <Table {...table} />
        ) : (
          <div className="border-border-subtle flex h-24 flex-col items-center justify-center gap-2 rounded-lg border">
            {fraudGroupsLoading ? (
              <LoadingSpinner />
            ) : (
              <p className="text-content-subtle text-sm">
                No past resolved fraud events found for this partner
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
