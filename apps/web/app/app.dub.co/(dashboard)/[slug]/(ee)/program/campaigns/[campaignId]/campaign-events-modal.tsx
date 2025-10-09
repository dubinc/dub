"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { SearchBox } from "@/ui/shared/search-box";
import {
  Modal,
  PaginationControls,
  Table,
  usePagination,
  useTable,
} from "@dub/ui";
import { buildUrl, fetcher } from "@dub/utils";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { useDebouncedCallback } from "use-debounce";
import { CampaignEvent, EventStatus } from "./campaign-events";
import { campaignEventsColumns } from "./campaign-events-columns";

export function CampaignEventsModal({
  showModal,
  setShowModal,
  status,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  status: EventStatus;
}) {
  const router = useRouter();
  const { campaignId } = useParams<{ campaignId: string }>();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const { pagination, setPagination } = usePagination();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const debounced = useDebouncedCallback(
    (value) => setDebouncedSearch(value),
    500,
  );

  const {
    data: events,
    error,
    isLoading,
  } = useSWR<CampaignEvent[]>(
    showModal && campaignId && workspaceId
      ? buildUrl(`/api/campaigns/${campaignId}/events`, {
          workspaceId,
          status,
          ...(debouncedSearch && { search: debouncedSearch }),
        })
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const {
    data: totalCount,
    error: countError,
    isLoading: isCountLoading,
  } = useSWR<number>(
    showModal && campaignId && workspaceId
      ? buildUrl(`/api/campaigns/${campaignId}/events/count`, {
          workspaceId,
          status,
          ...(debouncedSearch && { search: debouncedSearch }),
        })
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { table, ...tableProps } = useTable({
    data: events || [],
    columns: campaignEventsColumns,
    onRowClick: (row, e) => {
      const url = `/${workspaceSlug}/program/partners/${row.original.partner.id}`;

      if (e.metaKey || e.ctrlKey) {
        window.open(url, "_blank");
      } else {
        router.push(url);
        setShowModal(false);
      }
    },
    onRowAuxClick: (row) => {
      const url = `/${workspaceSlug}/program/partners/${row.original.partner.id}`;
      window.open(url, "_blank");
    },
    rowProps: () => ({
      className:
        "cursor-pointer transition-colors hover:bg-neutral-50 border-b border-neutral-200 last:border-b-0",
    }),
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: () => "partner",
    emptyState: "No partners found",
    loading: isLoading || isCountLoading,
    error: error || countError ? "Failed to load events" : undefined,
    rowCount: events?.length || 0,
  });

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="flex h-[700px] max-w-md flex-col px-0"
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <h1 className="text-lg font-semibold">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </h1>
      </div>

      <div className="flex-shrink-0 border-b border-neutral-200 px-4 py-3">
        <SearchBox
          value={search}
          onChange={(value) => {
            setSearch(value);
            debounced(value);
          }}
          placeholder="Search by partner name or email..."
          loading={isLoading && debouncedSearch.length > 0}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Table
            {...tableProps}
            table={table}
            className="[&_thead]:hidden"
            containerClassName="border-0 rounded-lg"
          />
        </div>

        {totalCount !== undefined && totalCount > 0 && (
          <div className="flex-shrink-0 border-t border-neutral-200 bg-white px-6 py-4">
            <PaginationControls
              pagination={pagination}
              setPagination={setPagination}
              totalCount={totalCount}
              unit={(p) => `event${p ? "s" : ""}`}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
