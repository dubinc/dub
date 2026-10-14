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
      <PageWidthWrapper className="pb-10">
        {/* below a 64rem page width, the wrappers are `contents`, so that every card is a cell of this grid and `order` moves Recent payouts, Tasks and Top links below Recent earnings */}
        <div className="@3xl/page:grid-cols-2 @5xl/page:grid-cols-1 grid grid-cols-1 gap-4">
          <div className="col-span-full">
            <SimpleDateRangePicker
              className="w-full sm:w-fit"
              align="start"
              defaultInterval={DUB_PARTNERS_ANALYTICS_INTERVAL}
            />
          </div>
          <div className="@5xl/page:block @5xl/page:rounded-2xl @5xl/page:bg-neutral-50 @5xl/page:p-4 contents">
            <div className="@5xl/page:grid @5xl/page:grid-cols-[minmax(0,1fr)_397px] @5xl/page:gap-4 contents">
              <div className="@5xl/page:contents col-span-full rounded-2xl bg-neutral-50 p-4">
                <EarningsChart />
              </div>
              <div className="@5xl/page:flex @5xl/page:h-full @5xl/page:flex-col @5xl/page:gap-3 contents">
                <div
                  data-testid={testIds.partnerOverview.recentPayouts}
                  className="order-1 flex min-h-0 flex-1 flex-col"
                >
                  <PayoutsCard className="h-full min-h-0 flex-1" />
                </div>
                <TasksCard className="order-1" />
              </div>
            </div>
          </div>
          <div className="@5xl/page:grid @5xl/page:grid-cols-3 @5xl/page:gap-4 contents">
            <TopProgramsCard />
            <RecentEarningsCard />
            <TopLinksCard className="order-1" />
          </div>
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
