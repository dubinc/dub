import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { useFraudGroups } from "@/lib/swr/use-fraud-groups";
import { FraudGroupProps } from "@/lib/types";
import { UserRowItem } from "@/ui/users/user-row-item";
import { Badge, LoadingSpinner, Table, Tooltip, useTable } from "@dub/ui";
import { cn, formatDate } from "@dub/utils";
import { Row } from "@tanstack/react-table";

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
      pageSize: 5,
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
    resourceName: (plural) => `resolved fraud event${plural ? "s" : ""}`,
    error: fraudGroupsError
      ? "Failed to load resolved fraud events"
      : undefined,
  });

  return (
    <div className="flex flex-col gap-3">
      {fraudGroups?.length ? (
        <Table {...table} />
      ) : (
        <div className="border-border-subtle flex flex-col items-center justify-center gap-2 rounded-lg border">
          {fraudGroupsLoading ? (
            <LoadingSpinner />
          ) : (
            <p className="text-content-subtle text-sm">
              No resolved fraud events yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
