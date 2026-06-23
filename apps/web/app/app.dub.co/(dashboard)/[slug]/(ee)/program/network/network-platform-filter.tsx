import { Popover } from "@dub/ui";
import {
  Globe,
  GlobePointer,
  Instagram,
  LinkedIn,
  TikTok,
  Twitter,
  User,
  YouTube,
} from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { PlatformType } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  isAllPlatformsSelected,
  NETWORK_FILTER_PLATFORMS,
} from "./platform-filter-utils";

const PLATFORM_META: Record<
  (typeof NETWORK_FILTER_PLATFORMS)[number],
  { label: string; icon: typeof User }
> = {
  website: { label: "Website", icon: Globe },
  youtube: { label: "YouTube", icon: YouTube },
  twitter: { label: "X", icon: Twitter },
  linkedin: { label: "LinkedIn", icon: LinkedIn },
  instagram: { label: "Instagram", icon: Instagram },
  tiktok: { label: "TikTok", icon: TikTok },
};

export function NetworkPlatformFilter({
  selectedPlatforms,
  onChange,
  className,
}: {
  selectedPlatforms: PlatformType[];
  onChange: (platforms: PlatformType[]) => void;
  className?: string;
}) {
  const [openPopover, setOpenPopover] = useState(false);

  const selectedSet = new Set(selectedPlatforms);
  const isFiltered = !isAllPlatformsSelected(selectedPlatforms);

  const toggle = (platform: PlatformType) => {
    if (selectedSet.has(platform)) {
      // Never let the user clear the last platform — an empty selection would
      // show nothing. Deselecting the last one is a no-op.
      if (selectedSet.size === 1) return;
      // Remove from the CURRENT selection, not the full list — otherwise a second
      // deselect would silently re-add the first.
      onChange(
        NETWORK_FILTER_PLATFORMS.filter(
          (p) => selectedSet.has(p) && p !== platform,
        ),
      );
    } else {
      onChange(
        NETWORK_FILTER_PLATFORMS.filter(
          (p) => selectedSet.has(p) || p === platform,
        ),
      );
    }
  };

  return (
    <Popover
      content={
        <div className="w-full p-1 md:w-52">
          {NETWORK_FILTER_PLATFORMS.map((platform) => {
            const { label, icon: Icon } = PLATFORM_META[platform];
            const isSelected = selectedSet.has(platform);

            return (
              <button
                key={platform}
                type="button"
                role="menuitemcheckbox"
                aria-checked={isSelected}
                onClick={() => toggle(platform)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-neutral-100 active:bg-neutral-200"
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-[filter,opacity]",
                    !isSelected && "opacity-40 grayscale",
                  )}
                />
                <span
                  className={cn(
                    "flex-1 text-left",
                    isSelected
                      ? "text-content-emphasis"
                      : "text-content-subtle",
                  )}
                >
                  {label}
                </span>
                <div
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-black bg-black"
                      : "border-neutral-300",
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
              </button>
            );
          })}
          <div className="my-1 border-t border-neutral-200" />
          <button
            type="button"
            onClick={() => onChange([...NETWORK_FILTER_PLATFORMS])}
            disabled={!isFiltered}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-content-subtle hover:bg-neutral-100 active:bg-neutral-200 disabled:pointer-events-none disabled:opacity-40"
          >
            <User className="size-4 shrink-0" />
            <span className="flex-1 text-left">All platforms</span>
          </button>
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      align="end"
    >
      <button
        type="button"
        onClick={() => setOpenPopover(!openPopover)}
        aria-label="Filter by channel"
        data-open={openPopover}
        className={cn(
          "group flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition-all",
          "focus-visible:border-neutral-500 data-[open=true]:border-neutral-500 data-[open=true]:ring-4 data-[open=true]:ring-neutral-200",
          className,
        )}
      >
        <GlobePointer className="text-content-emphasis size-4 shrink-0" />
        <span className="text-content-emphasis font-medium">Channels</span>
        {isFiltered ? (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black text-xs font-medium text-white">
            {selectedPlatforms.length}
          </span>
        ) : (
          // Same footprint as the count badge so the button width never drifts
          // between states (no popover jump on first filter / clear).
          <span className="flex size-5 shrink-0 items-center justify-center">
            <ChevronDown className="size-4 text-neutral-400 transition-transform duration-75 group-data-[open=true]:rotate-180" />
          </span>
        )}
      </button>
    </Popover>
  );
}
