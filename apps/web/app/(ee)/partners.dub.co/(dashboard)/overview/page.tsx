"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { testIds } from "@/lib/e2e/test-ids";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { PayoutsCard } from "../programs/[programSlug]/(enrolled)/payouts-card";
import { EarningsChart } from "./earnings-chart";
import { RecentEarningsCard } from "./recent-earnings-card";
import { TasksCard } from "./tasks-card";
import { TopLinksCard } from "./top-links-card";
import { TopProgramsCard } from "./top-programs-card";

export default function PartnerOverviewPage() {
  return (
    <PageContent title="Overview">
      <PageWidthWrapper className="flex flex-col gap-4 pb-10">
        <SimpleDateRangePicker
          className="w-full sm:w-fit"
          align="start"
          defaultInterval={DUB_PARTNERS_ANALYTICS_INTERVAL}
        />
        <div className="rounded-2xl bg-neutral-50 p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_397px]">
            <EarningsChart />
            <div className="flex h-full flex-col gap-3">
              <div
                data-testid={testIds.partnerOverview.recentPayouts}
                className="flex min-h-0 flex-1 flex-col"
              >
                <PayoutsCard className="h-full min-h-0 flex-1" />
              </div>
              <TasksCard />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <TopProgramsCard />
          <TopLinksCard />
          <RecentEarningsCard />
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
