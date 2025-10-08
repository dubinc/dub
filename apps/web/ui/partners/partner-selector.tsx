import usePartners from "@/lib/swr/use-partners";
import { PartnerProps } from "@/lib/types";
import { PARTNERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partners";
import { Combobox, ComboboxProps } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

export type Partner = Pick<PartnerProps, "id" | "name">;

type PartnerSelectorProps = {
  selectedPartnerId: string | null;
  setSelectedPartnerId: (partnerId: string) => void;
  disabled?: boolean;
  variant?: "default" | "header";
} & Partial<ComboboxProps<false, any>>;

export function PartnerSelector({
  selectedPartnerId,
  setSelectedPartnerId,
  disabled,
  variant = "default",
  ...rest
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
      query: selectedPartnerId
        ? { partnerIds: [selectedPartnerId] }
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

  const selectedOption = useMemo(() => {
    if (!selectedPartnerId) return null;

    const partner = [...(partners || []), ...(selectedPartners || [])].find(
      (p) => p.id === selectedPartnerId,
    );

    if (!partner) return null;

    return {
      value: partner.id,
      label: partner.name,
      icon: (
        <img
          src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
          className="size-4 rounded-full"
        />
      ),
    };
  }, [partners, selectedPartners, selectedPartnerId]);

  return (
    <Combobox
      options={loading ? undefined : partnerOptions}
      setSelected={(option) => {
        if (!option) return;
        setSelectedPartnerId(option.value);
      }}
      selected={selectedOption}
      icon={
        !selectedOption?.icon ? (
          <div className="size-5 flex-none animate-pulse rounded-full bg-neutral-200" />
        ) : (
          selectedOption?.icon
        )
      }
      caret={true}
      placeholder={selectedPartnersLoading ? "" : "Select partner"}
      searchPlaceholder="Search partners..."
      onSearchChange={setSearch}
      shouldFilter={!useAsync}
      matchTriggerWidth
      open={openPopover}
      onOpenChange={setOpenPopover}
      {...(variant === "header"
        ? {
            popoverProps: {
              contentClassName: "min-w-[280px]",
            },
            labelProps: {
              className: "text-lg font-semibold leading-7 text-neutral-900",
            },
            iconProps: {
              className: "size-6",
            },
            buttonProps: {
              disabled,
              className:
                "w-full justify-start px-3 transition-none max-md:bg-bg-subtle hover:bg-bg-emphasis md:hover:bg-neutral-50 border-none",
            },
          }
        : {
            buttonProps: {
              disabled,
              className: cn(
                "w-full justify-start border-neutral-300 px-3",
                "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
                "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
              ),
            },
          })}
      {...rest}
    >
      {!selectedOption?.label ? (
        <div className="h-6 w-[120px] animate-pulse rounded bg-neutral-100" />
      ) : (
        selectedOption.label
      )}
    </Combobox>
  );
}
