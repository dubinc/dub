import usePartners from "@/lib/swr/use-partners";
import { PartnerProps } from "@/lib/types";
import { PARTNERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partners";
import { Combobox } from "@dub/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

export type Partner = Pick<PartnerProps, "id" | "name">;

interface PartnerSelectorProps {
  selectedPartner: Partner | null;
  setSelectedPartner: (partner: Partner) => void;
  disabled?: boolean;
}

export function PartnerHeaderSelector({
  selectedPartner,
  setSelectedPartner,
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
      query: selectedPartner ? { partnerIds: [selectedPartner.id] } : undefined,
    });

  // Determine if we should use async loading
  useEffect(
    () =>
      setUseAsync(
        Boolean(
          partners && !useAsync && partners.length >= PARTNERS_MAX_PAGE_SIZE,
        ),
      ),
    [partners, useAsync],
  );

  const getPartnerById = useCallback(
    (partnerId: string) => {
      return (
        partners?.find((partner) => partner.id === partnerId) ??
        selectedPartners?.find((partner) => partner.id === partnerId)
      );
    },
    [partners, selectedPartners],
  );

  const partnerOptions = useMemo(() => {
    if (!partners && selectedPartner) {
      return [
        {
          value: selectedPartner.id,
          label: selectedPartner.name,
        },
      ];
    }

    return partners?.map((partner) => ({
      value: partner.id,
      label: partner.name,
    }));
  }, [partners, selectedPartner]);

  const selectedOption = useMemo(() => {
    if (!selectedPartner) return null;

    return {
      value: selectedPartner.id,
      label: selectedPartner.name,
    };
  }, [selectedPartner]);

  let label;

  if (selectedOption?.label) {
    label = selectedOption?.label;
  } else if (loading) {
    label = (
      <div className="my-0.5 h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
    );
  }

  const onChange = useCallback(
    (option: { value: string }) => {
      if (!option) {
        return;
      }

      const partner = getPartnerById(option.value);

      if (!partner) {
        return;
      }

      setSelectedPartner(partner);
    },
    [setSelectedPartner, getPartnerById],
  );

  return (
    <Combobox
      options={partnerOptions}
      setSelected={(option) => onChange(option)}
      selected={selectedOption}
      caret={true}
      placeholder={selectedPartnersLoading ? "" : "Select partner"}
      searchPlaceholder="Search partners..."
      onSearchChange={setSearch}
      shouldFilter={!useAsync}
      matchTriggerWidth
      open={openPopover}
      onOpenChange={setOpenPopover}
      popoverProps={{
        contentClassName: "min-w-[280px]",
      }}
      labelProps={{
        className: "text-lg font-semibold leading-7 text-neutral-900",
      }}
      iconProps={{
        className: "size-6",
      }}
      buttonProps={{
        disabled,
        className:
          "w-full justify-start px-3 transition-none max-md:bg-bg-subtle hover:bg-bg-emphasis md:hover:bg-neutral-50 border-none",
      }}
    >
      {label}
    </Combobox>
  );
}
