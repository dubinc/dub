import { Combobox } from "@dub/ui";
import { cn, COUNTRIES } from "@dub/utils";
import { useMemo } from "react";

export function CountryCombobox({
  value,
  onChange,
  disabledTooltip,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  disabledTooltip?: string;
  error?: boolean;
}) {
  const options = useMemo(
    () =>
      Object.entries(COUNTRIES)
        // show United States first
        .sort((a, b) => (a[0] === "US" ? -1 : b[0] === "US" ? 1 : 0))
        .map(([key, value]) => ({
          icon: (
            <img
              alt={value}
              src={`https://hatscripts.github.io/circle-flags/flags/${key.toLowerCase()}.svg`}
              className="mr-1.5 size-4"
            />
          ),
          value: key,
          label: value,
        })),
    [],
  );

  return (
    <Combobox
      selected={options.find((o) => o.value === value) ?? null}
      setSelected={(option) => {
        if (!option) return;
        onChange(option.value);
      }}
      options={options}
      icon={
        value ? (
          <img
            alt={COUNTRIES[value]}
            src={`https://hatscripts.github.io/circle-flags/flags/${value.toLowerCase()}.svg`}
            className="mr-0.5 size-4"
          />
        ) : undefined
      }
      caret={true}
      placeholder="Select country"
      searchPlaceholder="Search countries..."
      matchTriggerWidth
      buttonProps={{
        className: cn(
          "mt-1.5 w-full justify-start border-neutral-300 px-3",
          "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
          "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
          !value && "text-neutral-400",
          disabledTooltip && "cursor-not-allowed",
          error && "border-red-500 ring-red-500 ring-1",
        ),
        disabledTooltip,
      }}
    />
  );
}
