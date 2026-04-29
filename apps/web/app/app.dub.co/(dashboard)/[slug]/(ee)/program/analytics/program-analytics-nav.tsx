"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PageNavTabs } from "@/ui/layout/page-nav-tabs";
import { InvoiceDollar, LinesY } from "@dub/ui";

export type ProgramAnalyticsTabId = "performance" | "commissions";

export const PROGRAM_ANALYTICS_TABS: {
  id: ProgramAnalyticsTabId;
  label: string;
  icon: typeof LinesY;
}[] = [
  { id: "performance", label: "Performance", icon: LinesY },
  { id: "commissions", label: "Commissions", icon: InvoiceDollar },
];

export function ProgramAnalyticsNav() {
  const { slug } = useWorkspace();

  return (
    <PageNavTabs
      basePath={`/${slug}/program/analytics`}
      tabs={PROGRAM_ANALYTICS_TABS}
      preservedQueryParams={[
        "interval",
        "start",
        "end",
        "partnerId",
        "groupId",
      ]}
    />
  );
}
