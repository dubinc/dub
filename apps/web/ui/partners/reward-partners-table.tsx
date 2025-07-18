"use client";

import usePartners from "@/lib/swr/use-partners";
import { EnrolledPartnerProps } from "@/lib/types";
import { EventType } from "@dub/prisma/client";
import {
  Button,
  CircleWarning,
  Combobox,
  Table,
  Tooltip,
  useTable,
} from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

interface RewardPartnersTableProps {
  rewardPartners: EnrolledPartnerProps[];
  partnerIds: string[];
  setPartnerIds: (value: string[]) => void;
  loading: boolean;
  mode?: "include" | "exclude";
  label?: string;
  event: EventType;
  rewardId?: string;
}

export function RewardPartnersTable({
  partnerIds,
  setPartnerIds,
  rewardPartners,
  loading,
  mode = "include",
  label = mode === "include" ? "Eligible partners" : "Non-eligible partners",
  event,
  rewardId,
}: RewardPartnersTableProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [selectedPartners, setSelectedPartners] = useState<
    Pick<
      EnrolledPartnerProps,
      | "id"
      | "name"
      | "email"
      | "image"
      | "clickRewardId"
      | "leadRewardId"
      | "saleRewardId"
    >[]
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
          clickRewardId: partner.clickRewardId,
          leadRewardId: partner.leadRewardId,
          saleRewardId: partner.saleRewardId,
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

  useEffect(() => {
    if (rewardPartners && rewardPartners.length > 0) {
      setSelectedPartners(rewardPartners);
    }
  }, [rewardPartners]);

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

        // Then check rewardPartners
        const rewardPartner = rewardPartners?.find((p) => p.id === id);
        if (rewardPartner) return rewardPartner;

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
        cell: ({ row }) => {
          const existingRewardId = row.original[`${event}RewardId`];
          const isOnAnotherReward =
            !!existingRewardId && (!rewardId || existingRewardId !== rewardId);

          return (
            <div className="flex items-center gap-2">
              <img
                src={
                  row.original.image || `${OG_AVATAR_URL}${row.original.name}`
                }
                alt={row.original.name}
                className="size-6 shrink-0 rounded-full"
              />
              <span className="truncate text-sm text-neutral-700">
                {row.original.name}
              </span>

              {isOnAnotherReward && (
                <Tooltip content="This partner is currently on another reward and will be updated to this one.">
                  <div className="flex items-center justify-center rounded-md bg-orange-100 px-1.5 py-1">
                    <CircleWarning className="size-4 text-orange-500" />
                  </div>
                </Tooltip>
              )}
            </div>
          );
        },
        size: 180,
        minSize: 180,
        maxSize: 180,
      },
      {
        header: "Email",
        cell: ({ row }) => (
          <div className="truncate text-sm text-neutral-600">
            {row.original.email}
          </div>
        ),
        size: 160,
        minSize: 160,
        maxSize: 160,
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
    resourceName: (p) => `partner${p ? "s" : ""}`,
    getRowId: (row: EnrolledPartnerProps) => row.id,
    loading,
    rowCount: selectedPartners?.length || 0,
  });

  return (
    <div className="flex flex-col gap-3">
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
