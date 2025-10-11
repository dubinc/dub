"use client";

import { notFound } from "next/navigation";
import useCampaign from "../use-campaign";
import { CampaignEditor } from "./campaign-editor";
import { CampaignEditorSkeleton } from "./campaign-editor-skeleton";

export function ProgramCampaignPageClient() {
  const { campaign, error } = useCampaign();

  if (error) {
    return notFound();
  }

  if (!campaign) {
    return <CampaignEditorSkeleton />;
  }

  return <CampaignEditor campaign={campaign} />;
}
