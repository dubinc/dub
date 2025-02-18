import useRewardPartners from "@/lib/swr/use-reward-partners";
import useRewardPartnersCount from "@/lib/swr/use-reward-partners-count";
import { EnrolledPartnerProps } from "@/lib/types";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { X } from "@/ui/shared/icons";
import {
  Button,
  LoadingSpinner,
  Sheet,
  Table,
  usePagination,
  useTable,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { EventType } from "@prisma/client";
import { Search, Users } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

interface SheetProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onSelect: (partnerIds: string[]) => void;
  selectedPartnerIds: string[];
  event: EventType;
}

export function SelectEligiblePartnersSheet({
  isOpen,
  setIsOpen,
  onSelect,
  selectedPartnerIds,
  event,
}: SheetProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const { pagination, setPagination } = usePagination(25);
  const [selectedPartners, setSelectedPartners] = useState<
    EnrolledPartnerProps[]
  >([]);

  const {
    data: partners,
    error: partnersError,
    loading,
  } = useRewardPartners({
    query: {
      event,
      search: debouncedSearch,
      pageSize: pagination.pageSize,
      page: pagination.pageIndex || 1,
    },
  });

  const { partnersCount, loading: loadingCount } = useRewardPartnersCount({
    query: {
      event,
      search: debouncedSearch,
    },
  });

  useEffect(() => {
    if (!isOpen) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      setSearch("");
    }
  }, [isOpen, setPagination]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, setPagination]);

  useEffect(() => {
    if (partners && selectedPartnerIds.length > 0) {
      const rowsToSelect = table.table
        .getRowModel()
        .rows.filter((row) => selectedPartnerIds.includes(row.original.id));
      rowsToSelect.forEach((row) => row.toggleSelected(true));
    }
  }, [partners, selectedPartnerIds]);

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
        minSize: 5,
        size: 5,
      },
      {
        id: "partner",
        header: "Partner",
        cell: ({ row }) => (
          <PartnerRowItem partner={row.original} showPayoutsEnabled={false} />
        ),
      },
    ],
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `eligible partner${p ? "s" : ""}`,
    loading: loading || loadingCount,
    error: partnersError ? "Failed to load partners." : undefined,
    pagination,
    onPaginationChange: setPagination,
    rowCount: partnersCount || 0,
    getRowId: (originalRow) => originalRow.id,
    onRowSelectionChange: (rows) => {
      setSelectedPartners(rows.map((row) => row.original));
    },
  });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Add partners
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
        <div className="flex flex-col gap-4 p-6">
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
          {loading || loadingCount ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner className="size-4" />
            </div>
          ) : partners?.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-neutral-50 py-12">
              <div className="flex items-center justify-center">
                <Users className="size-6 text-neutral-800" />
              </div>
              <div className="flex flex-col items-center gap-1 px-4 text-center">
                <p className="text-base font-medium text-neutral-900">
                  No partners found
                </p>
                <p className="text-sm text-neutral-600">
                  {search
                    ? "Try a different search term"
                    : "No eligible partners available"}
                </p>
              </div>
            </div>
          ) : (
            <Table {...table} />
          )}
        </div>
        <div className="flex grow flex-col justify-end">
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
            <Button
              variant="secondary"
              onClick={() => setIsOpen(false)}
              text="Cancel"
              className="w-fit"
            />
            <Button
              variant="primary"
              text="Add"
              className="w-fit"
              onClick={() => {
                onSelect(selectedPartners.map((p) => p.id));
                setIsOpen(false);
              }}
              disabled={selectedPartners.length === 0}
              disabledTooltip={
                selectedPartners.length === 0
                  ? "At least one partner must be selected."
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
