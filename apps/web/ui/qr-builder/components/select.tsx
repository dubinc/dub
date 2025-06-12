import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { TWifiEncryptionOption } from "../constants/wifi-encryption-types.ts";

export interface ISelectOption {
  id: string;
  label: string;
}

interface ISelectProps {
  options: TWifiEncryptionOption[];
  value: ISelectOption | null;
  onChange?: (option: ISelectOption) => void;
}

export const Select = ({ options, value, onChange }: ISelectProps) => {
  const selectedLabel = value?.label ?? options[0]?.label ?? "";

  const handleSelect = (option: ISelectOption) => {
    onChange?.(option);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <div
          className={cn(
            "border-border-300 text-neutral flex h-11 w-full cursor-pointer items-center justify-between gap-3.5 rounded-md border bg-white px-3 text-sm transition-colors",
            "focus-within:border-secondary",
          )}
        >
          <span>{selectedLabel}</span>
          <Icon
            icon="line-md:chevron-down"
            className="text-xl text-neutral-200 transition-transform duration-300"
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
                "bg-secondary-100": value?.id === option.id,
              },
            )}
            onClick={() => handleSelect(option)}
          >
            <span
              className={cn("text-neutral text-sm", {
                "text-secondary": value?.id === option.id,
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
