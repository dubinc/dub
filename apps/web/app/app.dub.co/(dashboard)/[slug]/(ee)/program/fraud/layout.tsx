"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { ReactNode } from "react";
import { FraudUpsell } from "./fraud-upsell";

export default function FraudRiskLayout({ children }: { children: ReactNode }) {
  const { plan, loading } = useWorkspace();

  if (loading) {
    return <LayoutLoader />;
  }

  const { canManageFraudEvents } = getPlanCapabilities(plan);

  if (!canManageFraudEvents) {
    return <FraudUpsell />;
  }

  return children;
}
