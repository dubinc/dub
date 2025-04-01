"use client";

import useDiscountPartners from "@/lib/swr/use-discount-partners";
import usePartners from "@/lib/swr/use-partners";
import usePartnersCount from "@/lib/swr/use-partners-count";
import { EnrolledPartnerProps } from "@/lib/types";
import { Search } from "@/ui/shared/icons";
import { Table, usePagination, useTable } from "@dub/ui";
import { cn, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

interface DiscountPartnersTableProps {
  programId: string;
  discountId?: string;
  setValue: (value: string[]) => void;
}

export function DiscountPartnersTable({
  programId,
  discountId,
  setValue,
}: DiscountPartnersTableProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const { pagination, setPagination } = usePagination(25);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  const { data: partners, loading } = usePartners({
    query: {
      search: debouncedSearch,
      page: pagination.pageIndex || 1,
      pageSize: pagination.pageSize || 25,
    },
  });

  const { partnersCount } = usePartnersCount<number>({
    search: debouncedSearch,
  });

  const { data: discountPartners } = useDiscountPartners({
    query: {
      discountId,
    },
    enabled: Boolean(programId && discountId),
  });

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 1 }));
  }, [debouncedSearch, setPagination]);

  useEffect(() => {
    setSelectedRows(
      discountPartners?.reduce(
        (acc, partnerId) => {
          acc[partnerId] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      ) || {},
    );
  }, [discountPartners, partners]);

  const table = useTable({
    data: partners || [],
    columns: [
      {
        id: "selection",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer rounded-full border-neutral-300 text-black focus:outline-none focus:ring-0"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer rounded-full border-neutral-300 text-black focus:outline-none focus:ring-0"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        minSize: 10,
        size: 30,
      },
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
    onRowSelectionChange: (rows: Row<EnrolledPartnerProps>[]) => {
      setValue(rows.map((row) => row.original.id));
    },
  });

  return (
    <div className="my-2 flex flex-col gap-3">
      <label className="text-sm font-medium text-neutral-800">
        Eligible partners
      </label>

      <div className="relative">
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
      </div>

      <Table {...table} />
    </div>
  );
}
