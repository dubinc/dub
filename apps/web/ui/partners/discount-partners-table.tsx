"use client";

import usePartners from "@/lib/swr/use-partners";
import { EnrolledPartnerProps } from "@/lib/types";
import { Button, Combobox, Table, useTable } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

interface DiscountPartnersTableProps {
  partnerIds: string[];
  setPartnerIds: (value: string[]) => void;
  discountPartners: EnrolledPartnerProps[];
  loading: boolean;
  mode?: "include" | "exclude";
  label?: string;
}

export function DiscountPartnersTable({
  partnerIds,
  setPartnerIds,
  discountPartners,
  loading,
  mode = "include",
  label = mode === "include" ? "Eligible partners" : "Non-eligible partners",
}: DiscountPartnersTableProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [selectedPartners, setSelectedPartners] = useState<
    Pick<EnrolledPartnerProps, "id" | "name" | "email" | "image">[]
  >([]);

  // Get filtered partners for the combobox
  const { partners: searchPartners } = usePartners({
    query: {
      search: debouncedSearch,
    },
  });

  // Create a map for faster partner lookups
  const partnersMap = useMemo(() => {
    if (!searchPartners) {
      return new Map();
    }

    return new Map(
      searchPartners.map((partner) => [
        partner.id,
        {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          image: partner.image,
        },
      ]),
    );
  }, [searchPartners]);

  const partnersOptions = useMemo(
    () =>
      searchPartners?.map((partner) => ({
        icon: (
          <img
            alt={partner.name}
            src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
            className="mr-1.5 size-4 shrink-0 rounded-full"
          />
        ),
        value: partner.id,
        label: partner.name,
      })) || [],
    [searchPartners],
  );

  const selectedPartnersOptions = useMemo(
    () =>
      partnersOptions.filter((partner) => partnerIds.includes(partner.value)),
    [partnerIds, partnersOptions],
  );

  // Update selectedPartners when discountPartners changes
  useEffect(() => {
    if (discountPartners && discountPartners.length > 0) {
      setSelectedPartners(discountPartners);
    }
  }, [discountPartners]);

  const handlePartnerSelection = (
    selectedOptions: typeof selectedPartnersOptions,
  ) => {
    // Get all currently selected partner IDs that are not in the current search results
    const currentSelectedIds = new Set(partnerIds);

    // Remove deselected partners from current search results
    partnersOptions.forEach((option) => {
      if (
        !selectedOptions.some((selected) => selected.value === option.value)
      ) {
        currentSelectedIds.delete(option.value);
      }
    });

    // Add newly selected partners
    selectedOptions.forEach((option) => {
      currentSelectedIds.add(option.value);
    });

    // Convert to array and update partnerIds
    const newPartnerIds = Array.from(currentSelectedIds);
    setPartnerIds(newPartnerIds);

    // Update selectedPartners to maintain all selected partners
    const newSelectedPartners = newPartnerIds
      .map((id) => {
        // First check existing selected partners
        const existingPartner = selectedPartners?.find((p) => p.id === id);
        if (existingPartner) return existingPartner;

        // Then check discountPartners
        const discountPartner = discountPartners?.find((p) => p.id === id);
        if (discountPartner) return discountPartner;

        // Finally check the partnersMap for new selections
        return partnersMap.get(id) || null;
      })
      .filter(
        (partner): partner is NonNullable<typeof partner> => partner !== null,
      );

    setSelectedPartners(newSelectedPartners);
  };

  const table = useTable({
    data: selectedPartners,
    columns: [
      {
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <img
              src={row.original.image || `${OG_AVATAR_URL}${row.original.name}`}
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
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              icon={<X className="size-4" />}
              className="size-4 rounded-md border-0 bg-neutral-50 p-0 hover:bg-neutral-100"
              onClick={() => {
                setPartnerIds(
                  partnerIds.filter((id) => id !== row.original.id),
                );
                setSelectedPartners(
                  selectedPartners?.filter(
                    (partner) => partner.id !== row.original.id,
                  ),
                );
              }}
            />
          </div>
        ),
        size: 50,
        minSize: 50,
        maxSize: 50,
      },
    ],
    thClassName: () => cn("border-l-0"),
    tdClassName: () => cn("border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `eligible partner${p ? "s" : ""}`,
    getRowId: (row: EnrolledPartnerProps) => row.id,
    loading,
    rowCount: selectedPartners?.length || 0,
  });

  return (
    <div className="my-2 flex flex-col gap-3">
      <label className="text-sm font-medium text-neutral-800">{label}</label>

      <Combobox
        options={partnersOptions}
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
        Select partners...
      </Combobox>

      <Table {...table} />
    </div>
  );
}
