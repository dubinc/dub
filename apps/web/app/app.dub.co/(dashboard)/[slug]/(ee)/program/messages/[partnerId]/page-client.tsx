"use client";

import { useMessagesContext } from "@/ui/messages/messages-context";
import { ToggleSidePanelButton } from "@/ui/messages/toggle-side-panel-button";
import { X } from "@/ui/shared/icons";
import { ChevronLeft } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useState } from "react";

export function ProgramMessagesPartnerPageClient() {
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  const { setCurrentPanel } = useMessagesContext();

  return (
    <div
      className="relative grid h-full"
      style={{
        gridTemplateColumns: "minmax(340px, 1fr) minmax(0, min-content)",
      }}
    >
      <div>
        <div className="border-border-subtle flex h-12 items-center justify-between gap-4 border-b px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPanel("index")}
              className="@[800px]/page:hidden rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <h2 className="text-content-emphasis text-lg font-semibold leading-7">
              [Partner Name]
            </h2>
          </div>
          <ToggleSidePanelButton
            isOpen={isRightPanelOpen}
            onClick={() => setIsRightPanelOpen((o) => !o)}
          />
        </div>
        [messages with partner]
      </div>

      {/* Right panel - Profile */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-0 overflow-hidden bg-white shadow-lg transition-[width]",
          "@[960px]/page:shadow-none @[960px]/page:relative",
          isRightPanelOpen && "w-full sm:w-[340px]",
        )}
      >
        <div className="border-border-subtle size-full w-full border-l sm:w-[340px]">
          <div className="border-border-subtle flex h-12 items-center justify-between gap-4 border-b px-4 sm:h-16 sm:px-6">
            <h2 className="text-content-emphasis text-lg font-semibold leading-7">
              Profile
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRightPanelOpen(false)}
                className="@[960px]/page:hidden rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          <div>[profile panel content]</div>
        </div>
      </div>
    </div>
  );
}
