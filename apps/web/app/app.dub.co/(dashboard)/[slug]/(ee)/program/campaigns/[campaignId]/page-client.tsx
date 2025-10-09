"use client";

import { useMediaQuery } from "@dub/ui";
import { notFound } from "next/navigation";
import { useState } from "react";
import useCampaign from "../use-campaign";
import { CampaignEditor } from "./campaign-editor";
import { CampaignEditorSkeleton } from "./campaign-editor-skeleton";

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

  return <CampaignEditor campaign={campaign} />;
}
