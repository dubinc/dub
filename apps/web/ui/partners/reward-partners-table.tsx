"use client";

import usePartners from "@/lib/swr/use-partners";
import { EnrolledPartnerProps } from "@/lib/types";
import { Combobox, Table, useTable } from "@dub/ui";
import { cn, DICEBEAR_AVATAR_URL, pluralize } from "@dub/utils";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

interface RewardPartnersTableProps {
  partnerIds: string[];
  setPartners: (value: string[]) => void;
  loading: boolean;
}

export function RewardPartnersTable({
  partnerIds,
  setPartners,
  loading,
}: RewardPartnersTableProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [selectedPartners, setSelectedPartners] = useState<
    Pick<EnrolledPartnerProps, "id" | "name" | "email" | "image">[]
  >([]);

  // Get all partners for the table
  const { data: allPartners } = usePartners({});

  // Get filtered partners for the combobox
  const { data: searchPartners } = usePartners({
    query: {
      search: debouncedSearch,
    },
  });

  const options = useMemo(
    () =>
      searchPartners?.map((partner) => ({
        icon: (
          <img
            alt={partner.name}
            src={partner.image || ""}
            className="mr-1.5 size-4"
          />
        ),
        value: partner.id,
        label: partner.name,
      })),
    [searchPartners],
  );

  const selectedPartnersOptions = useMemo(
    () =>
      partnerIds
        .map((id) => options?.find(({ value }) => value === id)!)
        .filter(Boolean),
    [partnerIds, options],
  );

  // Update selected partners when partnerIds changes
  useEffect(() => {
    const updatedPartners = partnerIds
      .map((id) => allPartners?.find((partner) => partner.id === id))
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map((partner) => ({
        id: partner.id,
        name: partner.name,
        email: partner.email,
        image: partner.image,
      }));
    setSelectedPartners(updatedPartners);
  }, [partnerIds, allPartners]);

  const handlePartnerSelection = (
    selectedOptions: typeof selectedPartnersOptions,
  ) => {
    // Get all currently selected IDs
    const currentIds = new Set(partnerIds);

    // Add new selections
    selectedOptions.forEach(({ value }) => {
      currentIds.add(value);
    });

    setPartners(Array.from(currentIds));
  };

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
    thClassName: () => cn("border-l-0"),
    tdClassName: () => cn("border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `eligible partner${p ? "s" : ""}`,
    getRowId: (row: EnrolledPartnerProps) => row.id,
    loading,
    rowCount: selectedPartners.length,
  });

  return (
    <div className="my-2 flex flex-col gap-3">
      <label className="text-sm font-medium text-neutral-800">
        Eligible partners
      </label>

      <Combobox
        options={options}
        selected={selectedPartnersOptions}
        setSelected={handlePartnerSelection}
        caret
        placeholder="Select partners"
        searchPlaceholder="Search partners by name"
        matchTriggerWidth
        multiple
        shouldFilter={false}
        onSearchChange={setSearch}
        buttonProps={{
          className: cn(
            "w-full justify-start border-neutral-300 px-3",
            "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
            "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
            !selectedPartnersOptions.length && "text-neutral-400",
          ),
        }}
      >
        {selectedPartnersOptions.length > 0
          ? selectedPartnersOptions.length === 1
            ? selectedPartnersOptions[0].label
            : `${selectedPartnersOptions.length} ${pluralize("partner", selectedPartnersOptions.length)}`
          : "Partners"}
      </Combobox>

      <Table {...table} />
    </div>
  );
}
