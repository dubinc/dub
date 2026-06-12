"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PageNavTabs } from "@/ui/layout/page-nav-tabs";
import { CircleCheck, CircleHalfDottedClock } from "@dub/ui/icons";

const RISK_HISTORY_TABS = [
  {
    id: "resolved",
    label: "Resolved",
    icon: CircleCheck,
  },
  {
    id: "expired",
    label: "Expired",
    icon: CircleHalfDottedClock,
  },
];

export function RiskHistoryNav() {
  const { slug } = useWorkspace();

  return (
    <PageNavTabs
      basePath={`/${slug}/program/risks`}
      tabs={RISK_HISTORY_TABS}
      preservedQueryParams={["type", "partnerId"]}
    />
  );
}
