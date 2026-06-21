import { Popover } from "@dub/ui";
import { FlagWavy } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Check, ChevronDown } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";

type CountryOption = { value: string; label: string; right?: ReactNode };

export function NetworkCountryFilter({
  options,
  getOptionIcon,
  selectedValue,
  onSelect,
  onClear,
  className,
}: {
  options: CountryOption[];
  getOptionIcon?: (value: string) => ReactNode;
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClear: () => void;
  className?: string;
}) {
  const [openPopover, setOpenPopover] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((o) => o.value === selectedValue);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <Popover
      content={
        <div className="flex max-h-[320px] w-[260px] flex-col">
          <div className="border-b border-neutral-100 p-1">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries…"
              className="h-8 w-full rounded-md border-none bg-transparent px-2 text-sm outline-none placeholder:text-neutral-400"
            />
          </div>
          <div className="scrollbar-hide flex-1 overflow-y-auto p-1">
            {selectedValue && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setSearch("");
                  setOpenPopover(false);
                }}
                className="text-content-subtle flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-neutral-100 active:bg-neutral-200"
              >
                <FlagWavy className="size-4 shrink-0" />
                <span className="flex-1 text-left">All countries</span>
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="text-content-subtle px-2 py-6 text-center text-sm">
                No countries found
              </div>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === selectedValue;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    onClick={() => {
                      onSelect(option.value);
                      setSearch("");
                      setOpenPopover(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-neutral-100 active:bg-neutral-200"
                  >
                    {getOptionIcon?.(option.value)}
                    <span className="text-content-emphasis flex-1 truncate text-left">
                      {option.label}
                    </span>
                    {option.right && (
                      <span className="text-content-subtle shrink-0 text-xs tabular-nums">
                        {option.right}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="text-content-default size-4 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      align="start"
    >
      <button
        type="button"
        onClick={() => setOpenPopover(!openPopover)}
        data-open={openPopover}
        className={cn(
          "group flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition-all",
          "focus-visible:border-neutral-500 data-[open=true]:border-neutral-500 data-[open=true]:ring-4 data-[open=true]:ring-neutral-200",
          className,
        )}
      >
        {selectedOption ? (
          getOptionIcon?.(selectedOption.value)
        ) : (
          <FlagWavy className="text-content-subtle size-4 shrink-0" />
        )}
        <span
          className={cn(
            "min-w-0 truncate",
            selectedOption
              ? "text-content-emphasis font-medium"
              : "text-content-default",
          )}
        >
          {selectedOption ? selectedOption.label : "Country"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-neutral-400 transition-transform duration-75 group-data-[open=true]:rotate-180" />
      </button>
    </Popover>
  );
}
