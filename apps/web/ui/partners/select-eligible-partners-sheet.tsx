import usePartners from "@/lib/swr/use-partners";
import usePartnersCount from "@/lib/swr/use-partners-count";
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
import { Search, Users } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

interface SheetProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onSelect: (partners: EnrolledPartnerProps[]) => void;
  existingPartners: EnrolledPartnerProps[];
}

export function SelectEligiblePartnersSheet({
  isOpen,
  setIsOpen,
  onSelect,
  existingPartners,
}: SheetProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const { pagination, setPagination } = usePagination(25);
  const [selectedPartners, setSelectedPartners] =
    useState<EnrolledPartnerProps[]>(existingPartners);

  const {
    data: partners,
    error: partnersError,
    loading,
  } = usePartners({
    query: {
      search: debouncedSearch,
      page: pagination.pageIndex || 1,
      pageSize: pagination.pageSize || 25,
    },
  });

  const { partnersCount, error: partnersCountError } = usePartnersCount<number>(
    {
      search: debouncedSearch,
    },
  );

  useEffect(() => {
    if (!isOpen) {
      setPagination((prev) => ({ ...prev, pageIndex: 1 }));
      setSearch("");
      setSelectedPartners([]);
    }
  }, [isOpen, setPagination]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPartners(existingPartners);
    }
  }, [isOpen, existingPartners]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 1 }));
  }, [debouncedSearch, setPagination]);

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
        cell: ({ row }) => {
          const isSelected = selectedPartners.some(
            (p) => p.id === row.original.id,
          );

          return (
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded-full border-neutral-300 text-black focus:outline-none focus:ring-0"
              checked={isSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedPartners((prev) => [...prev, row.original]);
                } else {
                  setSelectedPartners((prev) =>
                    prev.filter((p) => p.id !== row.original.id),
                  );
                }
              }}
            />
          );
        },
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
    resourceName: (p) => `partner${p ? "s" : ""}`,
    loading,
    error:
      partnersError || partnersCountError
        ? "Failed to load partners."
        : undefined,
    pagination,
    onPaginationChange: setPagination,
    rowCount: partnersCount || 0,
    getRowId: (originalRow) => originalRow.id,
    onRowSelectionChange: (rows) => {
      // We're now handling selection directly in the checkbox onChange
      // This is only needed for the "select all" functionality
      if (partners) {
        const currentPageIds = partners.map((p) => p.id);

        if (rows.length === 0) {
          // Deselect all on current page
          setSelectedPartners((prev) =>
            prev.filter((p) => !currentPageIds.includes(p.id)),
          );
        } else {
          // Select all on current page
          const currentPagePartners = partners.filter((p) =>
            rows.some((row) => row.original.id === p.id),
          );
          setSelectedPartners((prev) => {
            const prevFiltered = prev.filter(
              (p) => !currentPageIds.includes(p.id),
            );
            return [...prevFiltered, ...currentPagePartners];
          });
        }
      }
    },
  });

  useEffect(() => {
    if (partners) {
      table.table.setRowSelection(
        selectedPartners
          .filter((p) => partners.some((partner) => partner.id === p.id))
          .reduce(
            (acc, partner) => {
              acc[partner.id] = true;
              return acc;
            },
            {} as Record<string, boolean>,
          ),
      );
    }
  }, [partners]);

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
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mr-4 mt-4 px-6">
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
          </div>
          <div className="flex-1 overflow-auto px-6">
            {loading ? (
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
              <div className="py-6">
                <Table {...table} />
              </div>
            )}
          </div>
          <div className="border-t border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-end gap-2">
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
                  onSelect(selectedPartners);
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
      </div>
    </Sheet>
  );
}
