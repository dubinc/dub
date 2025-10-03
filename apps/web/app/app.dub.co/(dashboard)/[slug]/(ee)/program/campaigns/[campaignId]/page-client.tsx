"use client";

import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { notFound } from "next/navigation";
import { useState } from "react";
import useCampaign from "../use-campaign";
import { CampaignEditor } from "./campaign-editor";
import { CampaignEditorSkeleton } from "./campaign-editor-skeleton";
import { CampaignMetrics } from "./campaign-metrics";

export function ProgramCampaignPageClient() {
  const { campaign, error, loading } = useCampaign();
  const { isMobile } = useMediaQuery();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(!isMobile);

  if (error) {
    return notFound();
  }

  if (loading || !campaign) {
    return <CampaignEditorSkeleton />;
  }

  return (
    <div className="@container/page h-[calc(100dvh-var(--page-top-margin)-1px)] w-full overflow-hidden rounded-t-[inherit] bg-white">
      <div
        className="relative grid h-full"
        style={{
          gridTemplateColumns: "minmax(340px, 1fr) minmax(0, min-content)",
        }}
      >
        {/* Left panel - Campaign editor */}
        <div className="size-full min-h-0">
          <CampaignEditor
            campaign={campaign}
            isRightPanelOpen={isRightPanelOpen}
            setIsRightPanelOpen={setIsRightPanelOpen}
          />
        </div>

        {/* Right panel - Metrics  */}
        <div
          className={cn(
            "absolute right-0 top-0 h-full min-h-0 w-0 overflow-hidden bg-white shadow-lg transition-[width]",
            "@[960px]/page:shadow-none @[960px]/page:relative",
            isRightPanelOpen && "w-full sm:w-[360px]",
          )}
        >
          <div className="border-border-subtle flex size-full min-h-0 w-full flex-col border-l sm:w-[360px]">
            <CampaignMetrics
              isOpen={isRightPanelOpen}
              onClose={() => setIsRightPanelOpen(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
