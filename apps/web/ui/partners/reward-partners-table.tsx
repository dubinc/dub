"use client";

import usePartners from "@/lib/swr/use-partners";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useRewardPartners from "@/lib/swr/use-reward-partners";
import { EnrolledPartnerProps } from "@/lib/types";
import { Table, usePagination, useTable } from "@dub/ui";
import { cn, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { PartnersCombobox } from "./partners-combobox";

interface RewardPartnersTableProps {
  programId: string;
  rewardId?: string;
  setValue: (value: string[]) => void;
}

export function RewardPartnersTable({
  programId,
  rewardId,
  setValue,
}: RewardPartnersTableProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const { pagination, setPagination } = usePagination(300);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  const [selectedPartners, setSelectedPartners] = useState<
    Pick<EnrolledPartnerProps, "id" | "name" | "image" | "email">[]
  >([]);

  const { data: partners, loading } = usePartners({
    query: {
      search: debouncedSearch,
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
    },
  });

  const { partnersCount } = usePartnersCount<number>({
    search: debouncedSearch,
  });

  const { data: rewardPartners } = useRewardPartners({
    query: {
      rewardId,
    },
    enabled: Boolean(programId && rewardId),
  });

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 1 }));
  }, [debouncedSearch, setPagination]);

  useEffect(() => {
    setSelectedRows(
      rewardPartners?.reduce(
        (acc, partnerId) => {
          acc[partnerId] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      ) || {},
    );
  }, [rewardPartners, partners]);

  const table = useTable({
    data: selectedPartners,
    columns: [
      {
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <img
              src={
                row.original.image ||
                `${DICEBEAR_AVATAR_URL}${row.original.name}`
              }
              alt={row.original.name}
              className="size-6 shrink-0 rounded-full"
            />
            <span className="truncate text-sm text-neutral-700">
              {row.original.name}
            </span>
          </div>
        ),
        size: 150,
        minSize: 150,
        maxSize: 150,
      },
      {
        header: "Email",
        cell: ({ row }) => (
          <div className="truncate text-sm text-neutral-600">
            {row.original.email}
          </div>
        ),
        size: 210,
        minSize: 210,
        maxSize: 210,
      },
    ],
    loading,
    thClassName: () => cn("border-l-0"),
    tdClassName: () => cn("border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `eligible partner${p ? "s" : ""}`,
    pagination,
    onPaginationChange: setPagination,
    rowCount: partnersCount,
    selectedRows,
    getRowId: (row: EnrolledPartnerProps) => row.id,
  });

  return (
    <div className="my-2 flex flex-col gap-3">
      <label className="text-sm font-medium text-neutral-800">
        Eligible partners
      </label>

      {/* <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="size-4 text-neutral-400" />
        </div>
        <input
          type="text"
          placeholder="Search partners"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-lg border-neutral-300 pl-10 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
        />
      </div> */}

      <PartnersCombobox
        onChange={setSelectedPartners}
        partners={partners || []}
      />

      <Table {...table} />
    </div>
  );
}
