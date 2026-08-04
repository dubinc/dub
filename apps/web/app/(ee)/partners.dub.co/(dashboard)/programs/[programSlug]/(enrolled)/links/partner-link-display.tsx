"use client";

import {
  PartnerLinksViewMode,
  usePartnerLinksDisplay,
} from "@/lib/swr/use-partner-links-display";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { Button, Popover } from "@dub/ui";
import { GridLayoutRows, Sliders, TableRows2 } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const DISPLAY_PROPERTIES = [
  { id: "link" as const, label: "Short link" },
  { id: "title" as const, label: "Title" },
];

export function PartnerLinkDisplay({ linksCount }: { linksCount?: number }) {
  const { showDetailedAnalytics } = useProgramEnrollment();
  const { preferTitle, setPreferTitle, viewMode, setViewMode } =
    usePartnerLinksDisplay({
      linksCount,
      showDetailedAnalytics,
    });
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <Popover
      content={
        <div className="w-full divide-y divide-neutral-200 text-sm md:w-80">
          {!!showDetailedAnalytics && (
            <div className="grid grid-cols-2 gap-2 p-3">
              {[
                { id: "cards" as const, label: "Cards", icon: GridLayoutRows },
                { id: "rows" as const, label: "Rows", icon: TableRows2 },
              ].map(({ id, label, icon: Icon }) => {
                const selected = viewMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      "flex h-16 flex-col items-center justify-center gap-1 rounded-md border border-transparent transition-colors",
                      selected
                        ? "border-neutral-300 bg-neutral-100 text-neutral-950"
                        : "text-neutral-800 hover:bg-neutral-100 hover:text-neutral-950",
                    )}
                    onClick={() => setViewMode(id as PartnerLinksViewMode)}
                    aria-pressed={selected}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 text-neutral-600",
                        selected && "text-neutral-800",
                      )}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          <div className="p-4">
            <span className="text-xs uppercase text-neutral-500">
              Display Properties
            </span>
            <div className="mt-4 flex flex-wrap gap-2">
              {DISPLAY_PROPERTIES.map((property) => {
                const active =
                  property.id === "title" ? preferTitle : !preferTitle;
                return (
                  <button
                    key={property.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPreferTitle(property.id === "title")}
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-sm",
                      active
                        ? "border-neutral-300 bg-neutral-100 text-neutral-950"
                        : "border-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950",
                    )}
                  >
                    {property.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <Button
        variant="secondary"
        className="w-fit hover:bg-white"
        textWrapperClassName="!overflow-visible"
        text={
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 shrink-0" />
            <span>Display</span>
            <ChevronDown
              className={cn("h-4 w-4 text-neutral-400 transition-transform", {
                "rotate-180": openPopover,
              })}
            />
          </div>
        }
      />
    </Popover>
  );
}
