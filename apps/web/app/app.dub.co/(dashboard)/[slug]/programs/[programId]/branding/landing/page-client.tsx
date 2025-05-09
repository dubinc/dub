"use client";

import { PreviewWindow } from "@/ui/partners/design/preview-window";
import { Brush, Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useState } from "react";

export function ProgramBrandingLandingPageClient() {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <div className="grow basis-0">
          <Button
            type="button"
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            data-state={isSidePanelOpen ? "open" : "closed"}
            variant="secondary"
            icon={<Brush className="size-4" />}
            className="hidden size-8 p-0 lg:flex"
          />
        </div>
        <span className="text-center text-xs font-medium text-neutral-500">
          Landing page
        </span>
        <div className="flex grow basis-0 justify-end">
          <Button
            type="button"
            onClick={() => alert("WIP")}
            variant="primary"
            text="Publish"
            className="h-8 w-fit"
          />
        </div>
      </div>
      <div
        className={cn(
          "grid grid-cols-1 transition-[grid-template-columns]",
          isSidePanelOpen
            ? "lg:grid-cols-[240px_minmax(0,1fr)]"
            : "lg:grid-cols-[0px_minmax(0,1fr)]",
        )}
      >
        <div className="h-full overflow-hidden">
          <div
            className={cn(
              "h-full border-neutral-200 p-5 transition-opacity max-lg:border-b lg:w-[240px] lg:border-r",
              !isSidePanelOpen && "opacity-0",
            )}
          >
            <div className="rounded-lg border border-neutral-300 bg-white p-3 text-sm text-neutral-500">
              WIP
            </div>
          </div>
        </div>
        <div className="h-[calc(100vh-300px)] p-4">
          <PreviewWindow url="https://partners.dub.co/claude">
            WIP
          </PreviewWindow>
        </div>
      </div>
    </div>
  );
}
