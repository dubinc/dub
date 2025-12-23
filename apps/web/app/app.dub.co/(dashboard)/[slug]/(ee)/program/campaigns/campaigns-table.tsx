"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign, CampaignList } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { CampaignStatus } from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  Button,
  Filter,
  MenuItem,
  Popover,
  StatusBadge,
  Table,
  TimestampTooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Dots, Duplicate, LoadingCircle, Trash } from "@dub/ui/icons";
import { fetcher, formatDateTimeSmart } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { Mail, Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { CAMPAIGN_STATUS_BADGES } from "./campaign-status-badges";
import { CampaignTypeIcon } from "./campaign-type-icon";
import { CreateCampaignButton } from "./create-campaign-button";
import { useDeleteCampaignModal } from "./delete-campaign-modal";
import { useCampaignsFilters } from "./use-campaigns-filters";

interface PartnersCountByGroup {
  groupId: string;
  _count: number;
}

export function CampaignsTable() {
  const router = useRouter();
  const { id: workspaceId, slug } = useWorkspace();
  const { pagination, setPagination } = usePagination();
  const { getQueryString } = useRouterStuff();

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  } = useCampaignsFilters();

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
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <CampaignTypeIcon type={row.original.type} />
            <span className="text-content-emphasis truncate text-sm font-medium">
              {row.original.name}
            </span>
          </div>
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
        id: "createdAt",
        header: "Created",
        accessorFn: (d) => d.createdAt,
        cell: ({ row }) => (
          <TimestampTooltip
            timestamp={row.original.createdAt}
            side="right"
            rows={["local"]}
            delayDuration={150}
          >
            <span>{formatDateTimeSmart(row.original.createdAt)}</span>
          </TimestampTooltip>
        ),
      },
      {
        id: "menu",
        minSize: 20,
        size: 20,
        maxSize: 20,
        cell: ({ row }) => <RowMenuButton row={row} />,
      },
    ],
    onRowClick: (row, e) => {
      const url = `/${slug}/program/campaigns/${row.original.id}`;

      if (e.metaKey || e.ctrlKey) {
        window.open(url, "_blank");
      } else {
        router.push(url);
      }
    },
    onRowAuxClick: (row) => {
      const url = `/${slug}/program/campaigns/${row.original.id}`;
      window.open(url, "_blank");
    },
    pagination,
    onPaginationChange: setPagination,
    columnPinning: { right: ["createdAt", "menu"] },
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
            !isFiltered
              ? "https://dub.co/help/article/email-campaigns"
              : undefined
          }
        />
      )}
    </div>
  );
}

function RowMenuButton({
  row: { original: campaign },
}: {
  row: Row<CampaignList>;
}) {
  const router = useRouter();
  const { slug } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  const { setShowDeleteCampaignModal, DeleteCampaignModal } =
    useDeleteCampaignModal(campaign);

  const {
    makeRequest: duplicateCampaign,
    isSubmitting: isDuplicatingCampaign,
  } = useApiMutation<{ id: string }>();

  const { makeRequest: updateCampaign, isSubmitting: isUpdatingCampaign } =
    useApiMutation<Campaign>();

  const handleCampaignDuplication = async () => {
    await duplicateCampaign(`/api/campaigns/${campaign.id}/duplicate`, {
      method: "POST",
      onSuccess: (campaign) => {
        router.push(`/${slug}/program/campaigns/${campaign.id}`);
        mutatePrefix("/api/campaigns");
      },
    });
  };

  const handlePauseResume = async () => {
    const newStatus = isPaused ? CampaignStatus.active : CampaignStatus.paused;
    const actionText = isPaused ? "resumed" : "paused";

    await updateCampaign(`/api/campaigns/${campaign.id}`, {
      method: "PATCH",
      body: {
        status: newStatus,
      },
      onSuccess: async () => {
        await mutatePrefix("/api/campaigns");
        toast.success(`Email campaign ${actionText}!`);
      },
    });
  };

  const isPaused = campaign.status === "paused";
  const isDraft = campaign.status === "draft";

  return (
    <>
      <DeleteCampaignModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[150px]">
              <MenuItem
                icon={isDuplicatingCampaign ? LoadingCircle : Duplicate}
                variant="default"
                onClick={handleCampaignDuplication}
                disabled={isDuplicatingCampaign}
              >
                Duplicate
              </MenuItem>

              {!isDraft && campaign.type === "transactional" && (
                <MenuItem
                  icon={
                    isUpdatingCampaign ? LoadingCircle : isPaused ? Play : Pause
                  }
                  variant="default"
                  onClick={handlePauseResume}
                  disabled={isUpdatingCampaign || isDuplicatingCampaign}
                >
                  {isPaused ? "Resume" : "Pause"}
                </MenuItem>
              )}

              <MenuItem
                icon={Trash}
                variant="danger"
                onClick={() => {
                  setIsOpen(false);
                  setShowDeleteCampaignModal(true);
                }}
              >
                Delete
              </MenuItem>
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

const calculatePercentage = (value: number, total: number) => {
  if (total === 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
};
