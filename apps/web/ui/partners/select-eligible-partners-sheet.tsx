import usePartners from "@/lib/swr/use-partners";
import usePartnersCount from "@/lib/swr/use-partners-count";
import { EnrolledPartnerProps } from "@/lib/types";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { X } from "@/ui/shared/icons";
import { Button, Sheet, Table, usePagination, useTable } from "@dub/ui";
import { cn } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

interface SheetProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onSelect: (partnerIds: string[]) => void;
  selectedPartnerIds: string[];
}

export function SelectEligiblePartnersSheet({
  isOpen,
  setIsOpen,
  onSelect,
  selectedPartnerIds,
}: SheetProps) {
  const { pagination, setPagination } = usePagination(20);

  const {
    data: partners,
    error: partnersError,
    loading,
  } = usePartners({
    query: {
      pageSize: pagination.pageSize,
      page: pagination.pageIndex,
    },
  });

  const { partnersCount } = usePartnersCount<number>({
    ignoreParams: true,
  });

  const [selectedPartners, setSelectedPartners] = useState<
    EnrolledPartnerProps[]
  >([]);

  useEffect(() => {
    if (!isOpen) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [isOpen, setPagination]);

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
          <PartnerRowItem partner={row.original as EnrolledPartnerProps} />
        ),
      },
    ],
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `eligible partner${p ? "s" : ""}`,
    loading,
    error: partnersError ? "Failed to load partners." : undefined,
    pagination,
    onPaginationChange: setPagination,
    rowCount: partnersCount || 0,
    getRowId: (originalRow: EnrolledPartnerProps) => originalRow.id,
    onRowSelectionChange: (rows: Row<EnrolledPartnerProps>[]) => {
      setSelectedPartners(
        rows.map((row) => row.original as EnrolledPartnerProps),
      );
    },
  });

  // pre-select partners based on selectedPartnerIds
  useEffect(() => {
    if (partners && selectedPartnerIds.length > 0) {
      const rowsToSelect = table.table
        .getRowModel()
        .rows.filter((row) =>
          selectedPartnerIds.includes(
            (row.original as EnrolledPartnerProps).id,
          ),
        );
      rowsToSelect.forEach((row) => row.toggleSelected(true));
    }
  }, [partners, selectedPartnerIds]);

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
            <input
              type="text"
              placeholder="Search partners"
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          </div>
          <Table {...table} />
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
                  : ""
              }
            />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
