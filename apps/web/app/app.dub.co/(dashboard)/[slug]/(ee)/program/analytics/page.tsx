"use client";

import { notFound, useParams } from "next/navigation";
import { AnalyticsChart } from "./analytics-chart";
import { AnalyticsPartnersTable } from "./analytics-partners-table";
import { CommissionsAnalyticsChart } from "./commissions-analytics-chart";
import { CommissionsPartnersTable } from "./commissions-partners-table";
import { CommissionsStatusSelector } from "./commissions-status-selector";
import {
  PROGRAM_ANALYTICS_TABS,
  ProgramAnalyticsTabId,
} from "./program-analytics-nav";
import { useCommissionsAnalyticsQuery } from "./use-commissions-analytics-query";

export default function ProgramAnalyticsTabPage() {
  const { tab } = useParams() as { tab?: ProgramAnalyticsTabId };

  if (tab && !PROGRAM_ANALYTICS_TABS.some((t) => t.id === tab)) {
    notFound();
  }

  if (tab === "commissions") {
    return <CommissionsTab />;
  }

  return (
    <>
      <AnalyticsChart />
      <AnalyticsPartnersTable />
    </>
  );
}

function CommissionsTab() {
  const {
    queryString: commissionsQueryString,
    status: commissionStatus,
    unit: commissionUnit,
    interval: commissionsInterval,
    start: commissionsStart,
    end: commissionsEnd,
  } = useCommissionsAnalyticsQuery();

  return (
    <>
      <CommissionsStatusSelector
        status={commissionStatus}
        queryString={commissionsQueryString}
      />
      <div className="relative h-72 md:h-96">
        <div className="relative size-full p-6 pt-10">
          <CommissionsAnalyticsChart
            status={commissionStatus}
            unit={commissionUnit}
            queryString={commissionsQueryString}
            interval={commissionsInterval}
            start={commissionsStart}
            end={commissionsEnd}
          />
        </div>
      </div>
      <CommissionsPartnersTable queryString={commissionsQueryString} />
    </>
  );
}
