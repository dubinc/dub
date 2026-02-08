"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { ReactNode } from "react";
import { CampaignsUpsell } from "./campaigns-upsell";

export default function CampaignsLayout({ children }: { children: ReactNode }) {
  const { plan, loading } = useWorkspace();

  if (loading) return <LayoutLoader />;

  if (!getPlanCapabilities(plan).canSendEmailCampaigns)
    return <CampaignsUpsell />;

  return children;
}
