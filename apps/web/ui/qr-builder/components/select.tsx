import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import { TWifiEncryptionOption } from "../constants/wifi-encryption-types.ts";

export interface ISelectOption {
  id: string;
  label: string;
}

interface ISelectProps {
  options: TWifiEncryptionOption[];
  onChange?: (option: ISelectOption) => void;
}

export const Select = ({ options, onChange }: ISelectProps) => {
  const [selectedOption, setSelectedOption] = useState<string>(
    options[0]?.label || "",
  );

  const handleSelect = (option: ISelectOption) => {
    setSelectedOption(option.label);
    onChange?.(option);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <div
          className={cn(
            "border-border-300 flex h-11 w-full cursor-pointer items-center justify-between rounded-md border bg-white px-3 text-sm text-neutral-200 transition-colors",
            "focus-within:border-secondary",
          )}
        >
          <span>{selectedOption}</span>
          <Icon
            icon="line-md:chevron-down"
            className={cn(
              "text-xl text-neutral-200 transition-transform duration-300",
            )}
          />
        </div>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        className="border-border-100 !z-10 flex flex-col items-center justify-start gap-2 rounded-lg border bg-white p-3 shadow-md"
        sideOffset={5}
        align="start"
      >
        {options.map((option) => (
          <DropdownMenu.Item
            key={option.id}
            className={cn(
              "hover:bg-secondary-100 flex h-9 w-full cursor-pointer items-center justify-between rounded-md bg-white p-3",
              {
                "bg-secondary-100": selectedOption === option.label,
              },
            )}
            onClick={() => handleSelect(option)}
          >
            <span
              className={cn("text-neutral text-sm", {
                "text-secondary": selectedOption === option.label,
              })}
            >
              {option.label}
            </span>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
