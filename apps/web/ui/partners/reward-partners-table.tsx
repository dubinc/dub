"use client";

import usePartners from "@/lib/swr/use-partners";
import { EnrolledPartnerProps } from "@/lib/types";
import { Combobox, Table, useTable } from "@dub/ui";
import { cn, DICEBEAR_AVATAR_URL, pluralize } from "@dub/utils";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

interface RewardPartnersTableProps {
  programId: string;
  rewardId?: string;
  partnerIds: string[];
  setPartners: (value: string[]) => void;
}

export function RewardPartnersTable({
  programId,
  rewardId,
  partnerIds,
  setPartners,
}: RewardPartnersTableProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { data: partners } = usePartners({
    query: {
      search: debouncedSearch,
    },
  });

  const options = useMemo(
    () =>
      partners?.map((partner) => ({
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
    [partners],
  );

  const selectedPartnersOptions = useMemo(
    () =>
      partnerIds
        .map((id) => options?.find(({ value }) => value === id)!)
        .filter(Boolean),
    [partnerIds, options],
  );

  const selectedPartners = useMemo(
    () =>
      partnerIds
        .map((id) => partners?.find((partner) => partner.id === id))
        .filter((p): p is NonNullable<typeof p> => p != null)
        .map((partner) => ({
          id: partner.id,
          name: partner.name,
          email: partner.email,
          image: partner.image,
        })),
    [partnerIds, partners],
  );

  const handlePartnerSelection = (
    selectedOptions: typeof selectedPartnersOptions,
  ) => {
    const newSelectedIds = selectedOptions.map(({ value }) => value);
    setPartners(newSelectedIds);
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
