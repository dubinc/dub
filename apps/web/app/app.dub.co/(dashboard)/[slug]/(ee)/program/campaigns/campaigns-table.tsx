"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { CampaignList } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Filter,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { cn, fetcher, formatDateTime, formatDateTimeSmart } from "@dub/utils";
import { Mail } from "lucide-react";
import useSWR from "swr";
import { CAMPAIGN_STATUS_BADGES } from "./campaign-status-badges";
import { CAMPAIGN_TYPE_BADGES } from "./campaign-type-badges";
import { CreateCampaignButton } from "./create-campaign-button";
import { useCampaignsFilters } from "./use-campaigns-filters";

export function CampaignsTable() {
  const { id: workspaceId } = useWorkspace();
  const { pagination, setPagination } = usePagination();
  const { queryParams, searchParams, getQueryString } = useRouterStuff();

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  } = useCampaignsFilters();

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
            CAMPAIGN_TYPE_BADGES[row.original.type];

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
          const badge = CAMPAIGN_STATUS_BADGES[row.original.status];

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
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
          <SearchBoxPersisted
            placeholder="Search by name"
            inputClassName="md:w-[19rem]"
          />
        </div>
        <AnimatedSizeContainer height>
          <div>
            {activeFilters.length > 0 && (
              <div className="pt-3">
                <Filter.List
                  filters={filters}
                  activeFilters={activeFilters}
                  onRemove={onRemove}
                  onRemoveAll={onRemoveAll}
                />
              </div>
            )}
          </div>
        </AnimatedSizeContainer>
      </div>

      {campaigns?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="Email campaigns"
          description={
            !isFiltered
              ? "Create one-off or automated emails to send to your partners."
              : "No campaigns found for the selected filters."
          }
          cardContent={() => (
            <>
              <Mail className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
          addButton={!isFiltered ? <CreateCampaignButton /> : undefined}
          learnMoreHref={
            !isFiltered ? "https://dub.co/docs/email-campaigns" : undefined
          }
        />
      )}
    </div>
  );
}
