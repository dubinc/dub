import { Popover } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { Icon } from "@iconify/react";
import { Flex } from "@radix-ui/themes";
import { Command } from "cmdk";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Country, getCountryCallingCode } from "react-phone-number-input/input";

interface ICountryOption {
  value: Country;
  label: string;
}

interface CountrySelectProps {
  value?: Country;
  onChange: (value: Country) => void;
  options: ICountryOption[];
  disabled?: boolean;
  className?: string;
}

const DEFAULT_COUNTRY: Country = "US";

export const CountrySelectAutocompleteComponent = ({
  value,
  onChange,
  options,
  disabled,
  className,
}: CountrySelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const initialSelectedValue = value ?? DEFAULT_COUNTRY;
  const [selectedValue, setSelectedValue] =
    useState<Country>(initialSelectedValue);

  const sortedOptions = useMemo(() => {
    return [...options]
      .filter((option) => option.value && option.value !== "AC")
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [options]);

  const filteredOptions = useMemo(() => {
    return sortedOptions.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [sortedOptions, search]);

  useEffect(() => {
    setSelectedValue(value ?? DEFAULT_COUNTRY);
  }, [value]);

  const handleSelect = (val: Country) => {
    setSelectedValue(val);
    onChange(val);
    setOpen(false);
  };

  return (
    <Popover
      openPopover={open}
      setOpenPopover={setOpen}
      content={
        <Command className="w-full max-w-36 rounded-md bg-white text-base shadow-md">
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search..."
            className="focus:border-secondary border-b-border-500 w-auto max-w-36 rounded-md rounded-b-none border-x-0 border-b border-t-0 px-3 py-2 text-sm text-neutral-800 focus:border-b-0"
            disabled={disabled}
          />

          <div className="relative mt-1 max-h-60 overflow-auto">
            <Command.List className="max-h-60 overflow-auto pr-1">
              {filteredOptions.length === 0 ? (
                <Command.Empty className="px-3 py-2 text-neutral-800">
                  No results found.
                </Command.Empty>
              ) : (
                filteredOptions.map((option) => (
                  <Command.Item
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="hover:bg-border-500 text-neutral mx-1 flex cursor-pointer items-center justify-start gap-2 rounded-md px-3 py-2 text-sm"
                  >
                    <Image
                      src={`https://flagcdn.com/${option.value.toLowerCase()}.svg`}
                      alt={option.value}
                      width={24}
                      height={24}
                      className="shrink-0"
                    />
                    <span>{option.value}</span>
                    <span className="text-sm text-neutral-200">
                      (+{getCountryCallingCode(option.value)})
                    </span>
                  </Command.Item>
                ))
              )}
            </Command.List>

            <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-full rounded-md bg-gradient-to-t from-white to-transparent" />
          </div>
        </Command>
      }
    >
      <button
        type="button"
        className={cn(
          "border-border-500 flex h-11 w-full max-w-36 items-center justify-between gap-2 rounded-md rounded-l-md rounded-r-none border border-r-0 px-3 py-2 text-sm",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        onClick={() => !disabled && setOpen((prev) => !prev)}
      >
        <Flex gap="2">
          <Image
            src={`https://flagcdn.com/${selectedValue.toLowerCase()}.svg`}
            alt={selectedValue}
            width={24}
            height={24}
            className="shrink-0"
          />
          <span className="text-neutral truncate text-sm">{selectedValue}</span>
        </Flex>
        <Icon
          icon={"line-md:chevron-down"}
          className={cn("transition-transform duration-200", "rotate-[0deg]", {
            "rotate-180": open,
          })}
        />
      </button>
    </Popover>
  );
};
