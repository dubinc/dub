import { CountryFlag } from "@/ui/shared/country-flag";
import { Combobox } from "@dub/ui";
import { cn, COUNTRIES } from "@dub/utils";
import { ReactNode, useMemo } from "react";

export function CountryCombobox({
  value,
  onChange,
  countries,
  disabledTooltip,
  error,
  className,
  open,
  onOpenChange,
}: {
  value: string;
  onChange: (value: string) => void;
  countries?: string[];
  disabledTooltip?: string | ReactNode;
  error?: boolean;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const options = useMemo(() => {
    const entries = countries
      ? countries.flatMap((code) =>
          COUNTRIES[code] ? [[code, COUNTRIES[code]] as const] : [],
        )
      : Object.entries(COUNTRIES);

    return entries
      .sort((a, b) => (a[0] === "US" ? -1 : b[0] === "US" ? 1 : 0))
      .map(([key, label]) => ({
        icon: <CountryFlag countryCode={key} className="mr-1.5" />,
        value: key,
        label,
      }));
  }, [countries]);

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
          <CountryFlag countryCode={value} className="mr-0.5" />
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
          className,
        ),
        disabledTooltip,
      }}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
