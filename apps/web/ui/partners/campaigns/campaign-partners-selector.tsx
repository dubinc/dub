// @ts-nocheck
// TODO: fix this

import usePartners from "@/lib/swr/use-partners";
import { PARTNERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partners";
import { Combobox } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

interface PartnerSelectorProps {
  selectedPartnerIds: string[];
  setSelectedPartnerIds: (partnerIds: string[]) => void;
  disabled?: boolean;
}

export function CampaignPartnersSelector({
  selectedPartnerIds,
  setSelectedPartnerIds,
  disabled,
}: PartnerSelectorProps) {
  const [search, setSearch] = useState("");
  const [useAsync, setUseAsync] = useState(false);
  const [debouncedSearch] = useDebounce(search, 500);
  const [openPopover, setOpenPopover] = useState(false);

  const { partners, loading } = usePartners({
    query: useAsync ? { search: debouncedSearch } : undefined,
  });

  const { partners: selectedPartners, loading: selectedPartnersLoading } =
    usePartners({
      query:
        selectedPartnerIds.length > 0
          ? { partnerIds: selectedPartnerIds }
          : undefined,
    });

  useEffect(() => {
    if (partners && !useAsync && partners.length >= PARTNERS_MAX_PAGE_SIZE) {
      setUseAsync(true);
    }
  }, [partners, useAsync]);

  const partnerOptions = useMemo(() => {
    return partners?.map((partner) => ({
      value: partner.id,
      label: partner.name,
      icon: (
        <img
          src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
          className="size-4 rounded-full"
        />
      ),
    }));
  }, [partners]);

  const selectedOptions = useMemo(() => {
    const partnerData = selectedPartnerIds
      .map((id) =>
        [...(partners || []), ...(selectedPartners || [])].find(
          (p) => p.id === id,
        ),
      )
      .filter((p) => p !== undefined);

    return partnerData.map((partner) => ({
      value: partner.id,
      label: partner.name,
      icon: (
        <img
          src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
          className="size-4 rounded-full"
        />
      ),
    }));
  }, [partners, selectedPartners, selectedPartnerIds]);

  return (
    <Combobox
      options={loading ? undefined : partnerOptions}
      onSelect={({ value: id }) =>
        setSelectedPartnerIds(
          selectedPartnerIds.includes(id)
            ? selectedPartnerIds.filter((sid) => sid !== id)
            : [...selectedPartnerIds, id],
        )
      }
      selected={selectedOptions}
      caret={true}
      placeholder={selectedPartnersLoading ? "" : "Select partner"}
      searchPlaceholder="Search partner..."
      onSearchChange={setSearch}
      shouldFilter={!useAsync}
      matchTriggerWidth
      open={openPopover}
      onOpenChange={setOpenPopover}
      buttonProps={{
        disabled,
        className: cn(
          "w-full justify-start border-neutral-300 px-3",
          "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
          "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
        ),
      }}
    >
      {selectedPartnersLoading ? (
        <div className="my-0.5 h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
      ) : selectedOptions?.length > 0 ? (
        `${selectedOptions.length} partners`
      ) : (
        "All partners"
      )}
    </Combobox>
  );
}
