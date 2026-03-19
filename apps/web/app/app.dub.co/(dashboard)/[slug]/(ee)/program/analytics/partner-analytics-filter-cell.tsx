"use client";

import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { FilterBars } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

interface PartnerAnalyticsFilterCellProps {
  partner: {
    id: string;
    name: string;
    image?: string | null;
  };
  partnerId: string;
  isStaged: boolean;
  isApplied: boolean;
  onToggle: () => void;
}

export function PartnerAnalyticsFilterCell({
  partner,
  partnerId,
  isStaged,
  isApplied,
  onToggle,
}: PartnerAnalyticsFilterCellProps) {
  const { slug } = useParams() as { slug: string };
  const isActive = isStaged || isApplied;

  return (
    <div
      className="flex cursor-pointer select-none items-center gap-2"
      onClick={onToggle}
    >
      <div className="relative size-6 shrink-0">
        <div
          className={cn(
            "flex size-full items-center justify-center transition-all duration-200",
            isActive
              ? "translate-x-3 opacity-0"
              : "group-hover:translate-x-3 group-hover:opacity-0",
          )}
        >
          <PartnerAvatar partner={partner} className="size-5" />
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1",
              isActive
                ? "pointer-events-auto translate-x-0 bg-neutral-900 opacity-100"
                : cn(
                    "-translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                    "pointer-events-none group-hover:pointer-events-auto",
                    "border border-neutral-200 bg-white",
                  ),
            )}
            aria-label="Toggle partner filter"
          >
            <FilterBars
              className={cn(
                "size-3",
                isActive ? "text-white" : "text-neutral-500",
              )}
            />
          </button>
        </div>
      </div>

      <Link
        href={`/${slug}/program/partners/${partnerId}`}
        target="_blank"
        onClick={(e) => e.stopPropagation()}
        className="min-w-0 cursor-alias truncate decoration-dotted hover:underline"
        title={partner.name}
      >
        {partner.name}
      </Link>
    </div>
  );
}
