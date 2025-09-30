"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { CampaignList } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import {
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { cn, fetcher, formatDateTime, formatDateTimeSmart } from "@dub/utils";
import { CampaignStatus } from "@prisma/client";
import { Mail } from "lucide-react";
import useSWR from "swr";
import { CampaignTypeBadges } from "./campaign-stats";
import { CreateCampaignButton } from "./create-campaign-button";

export const CampaignStatusBadges: Record<
  CampaignStatus,
  { label: string; variant: string }
> = {
  draft: {
    label: "Draft",
    variant: "neutral",
  },
  active: {
    label: "Active",
    variant: "success",
  },
  paused: {
    label: "Paused",
    variant: "warning",
  },
  sent: {
    label: "Sent",
    variant: "neutral",
  },
};

export function CampaignsTable() {
  const { id: workspaceId } = useWorkspace();
  const { pagination, setPagination } = usePagination();
  const { queryParams, searchParams, getQueryString } = useRouterStuff();

  const sortBy = searchParams.get("sortBy") || "updatedAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const {
    data: campaigns,
    isLoading: campaignsLoading,
    error,
  } = useSWR<CampaignList[]>(
    workspaceId &&
      `/api/campaigns${getQueryString({
        workspaceId: workspaceId,
      }).toString()}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { table, ...tableProps } = useTable<CampaignList>({
    data: campaigns || [],
    columns: [
      {
        id: "email",
        header: "Email",
        enableHiding: false,
        minSize: 200,
        cell: ({ row }) => {
          const { icon: Icon, iconClassName } =
            CampaignTypeBadges[row.original.type];

          return (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-md",
                  iconClassName,
                )}
              >
                <Icon className="size-3.5" />
              </div>
              <span className="text-content-emphasis text-sm font-medium">
                {row.original.name}
              </span>
            </div>
          );
        },
      },
      {
        id: "updatedAt",
        header: "Updated",
        accessorFn: (d) => d.updatedAt,
        cell: ({ row }) => (
          <p title={formatDateTime(row.original.updatedAt)}>
            {formatDateTimeSmart(row.original.updatedAt)}
          </p>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const badge = CampaignStatusBadges[row.original.status];

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
        id: "partners",
        header: "Partners",
        accessorFn: (d) => d.partners,
      },
      {
        id: "delivered",
        header: "Delivered",
        accessorFn: (d) => d.delivered,
      },
      {
        id: "bounced",
        header: "Bounced",
        accessorFn: (d) => d.bounced,
      },
      {
        id: "opened",
        header: "Opened",
        accessorFn: (d) => d.opened,
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: ["updatedAt", "status", "delivered", "bounced", "opened"],
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
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `campaign${p ? "s" : ""}`,
    rowCount: campaigns?.length || 0,
    loading: campaignsLoading,
    error: error ? "Failed to load campaigns" : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      {campaigns?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="Email campaigns"
          description="Create one-off or automated emails to send to your partners."
          cardContent={() => (
            <>
              <Mail className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
          addButton={<CreateCampaignButton />}
          learnMoreHref="https://dub.co/docs/email-campaigns"
        />
      )}
    </div>
  );
}
