import {
  REACH_TIER_KEYS,
  REACH_TIERS,
  type ReachTier,
} from "@/lib/api/network/reach-tiers";
import { Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronDown, Users } from "lucide-react";
import { useState } from "react";

export function NetworkReachFilter({
  selectedTiers,
  onChange,
  className,
}: {
  selectedTiers: ReachTier[];
  onChange: (tiers: ReachTier[]) => void;
  className?: string;
}) {
  const [openPopover, setOpenPopover] = useState(false);

  const selectedSet = new Set(selectedTiers);
  const isFiltered = selectedTiers.length > 0;

  const toggle = (tier: ReachTier) =>
    onChange(
      selectedSet.has(tier)
        ? REACH_TIER_KEYS.filter((t) => t !== tier && selectedSet.has(t))
        : REACH_TIER_KEYS.filter((t) => selectedSet.has(t) || t === tier),
    );

  const label = !isFiltered
    ? "Audience"
    : selectedTiers.length === 1
      ? REACH_TIERS[selectedTiers[0]].range
      : `Audience · ${selectedTiers.length}`;

  return (
    <Popover
      content={
        <div className="w-full p-1 md:w-56">
          {REACH_TIER_KEYS.map((tier) => {
            const { range, descriptor } = REACH_TIERS[tier];
            const isSelected = selectedSet.has(tier);

            return (
              <button
                key={tier}
                type="button"
                role="menuitemcheckbox"
                aria-checked={isSelected}
                onClick={() => toggle(tier)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-neutral-100 active:bg-neutral-200"
              >
                <div
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected ? "border-black bg-black" : "border-neutral-300",
                  )}
                >
                  {isSelected && (
                    <svg
                      viewBox="0 0 12 12"
                      className="size-3 text-white"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.5 6.5L5 9L9.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-content-emphasis flex-1 text-left tabular-nums">
                  {range}
                </span>
                <span className="text-content-subtle">{descriptor}</span>
              </button>
            );
          })}
          {isFiltered && (
            <>
              <div className="my-1 border-t border-neutral-200" />
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-content-subtle flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-neutral-100 active:bg-neutral-200"
              >
                Clear
              </button>
            </>
          )}
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
          "group flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm outline-none transition-all",
          isFiltered
            ? "border-neutral-300 bg-white"
            : "border-neutral-200 bg-white",
          "focus-visible:border-neutral-500 data-[open=true]:border-neutral-500 data-[open=true]:ring-4 data-[open=true]:ring-neutral-200",
          className,
        )}
      >
        <Users className="text-content-subtle size-4 shrink-0" />
        <span
          className={cn(
            "whitespace-nowrap",
            isFiltered ? "text-content-emphasis font-medium" : "text-content-default",
          )}
        >
          {label}
        </span>
        <ChevronDown className="size-4 shrink-0 text-neutral-400 transition-transform duration-75 group-data-[open=true]:rotate-180" />
      </button>
    </Popover>
  );
}
