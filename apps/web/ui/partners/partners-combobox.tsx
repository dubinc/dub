import { PartnerProps } from "@/lib/types";
import { Combobox } from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { useEffect, useMemo, useState } from "react";

export function PartnersCombobox({
  onChange,
  partners,
}: {
  onChange: (
    value: Pick<PartnerProps, "id" | "name" | "image" | "email">[],
  ) => void;
  partners: Pick<PartnerProps, "id" | "name" | "image" | "email">[];
}) {
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);

  const options = useMemo(
    () =>
      partners.map((partner) => ({
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

  const selectedPartners = useMemo(
    () =>
      selectedPartnerIds
        .map((id) => options?.find(({ value }) => value === id)!)
        .filter(Boolean),

    [selectedPartnerIds, options],
  );

  useEffect(() => {
    onChange(
      selectedPartnerIds.map(
        (id) => partners.find((partner) => partner.id === id)!,
      ),
    );
  }, [selectedPartnerIds]);

  return (
    <Combobox
      options={options}
      selected={selectedPartners}
      setSelected={(partners) => {
        setSelectedPartnerIds(partners.map(({ value }) => value));
      }}
      caret={true}
      placeholder="Select partners"
      searchPlaceholder="Search partners by name"
      matchTriggerWidth
      multiple
      buttonProps={{
        className: cn(
          "w-full justify-start border-neutral-300 px-3",
          "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
          "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
          !selectedPartners.length && "text-neutral-400",
        ),
      }}
    >
      {selectedPartners.length > 0
        ? selectedPartners.length === 1
          ? selectedPartners[0].label
          : `${selectedPartners.length} ${pluralize("partner", selectedPartners.length)}`
        : "Partners"}
    </Combobox>
  );
}
