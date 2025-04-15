import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import { useEffect, useRef, useState } from "react";
import { TEncryptionOption } from "../types.ts";

interface ISelectOption {
  id: string;
  label: string;
}

interface ISelectProps {
  options: TEncryptionOption[];
}

// Custom select because Select component from Radix is not working and from the design, it's not the same as used in dub.co
export const Select = ({ options }: ISelectProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string>(
    options[0]?.label || "",
  );

  const selectRef = useRef<HTMLDivElement | null>(null);

  const handleSelect = (option: ISelectOption) => {
    setSelectedOption(option.label);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={selectRef}>
      <div
        className={cn(
          "border-border-300 flex h-11 w-full cursor-pointer items-center justify-between rounded-md border bg-white px-3 text-sm text-neutral-200 transition-colors",
          "focus-within:border-secondary",
        )}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <span>{selectedOption}</span>
        <Icon
          icon="line-md:chevron-down"
          className={cn(
            "text-xl text-neutral-200 transition-transform duration-300",
            {
              "rotate-180": isOpen,
            },
          )}
        />
      </div>

      {isOpen && (
        <div className="border-border-100 absolute left-0 z-10 mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-lg border bg-white p-3 shadow-md">
          {options.map((option) => (
            <div
              key={option.id}
              className={cn(
                "hover:bg-primary-200 flex h-9 w-full cursor-pointer items-center justify-between rounded-md bg-white p-3",
                {
                  "bg-primary-300": selectedOption === option.label,
                },
              )}
              onClick={() => handleSelect(option)}
            >
              <span className="text-neutral text-sm">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
