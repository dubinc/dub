"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { ReactNode } from "react";
import { NetworkUpsell } from "./network-upsell";

export default function PartnerNetworkLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { plan } = useWorkspace();
  const { program, loading } = useProgram();

  if (loading) return <LayoutLoader />;

  if (!program?.partnerNetworkEnabledAt) return <NetworkUpsell contactUs />;

  const { canDiscoverPartners } = getPlanCapabilities(plan);
  if (!canDiscoverPartners) return <NetworkUpsell />;

  return children;
}
