"use client";
import { cn } from "@dub/utils";
/* 
  This Analytics component lives in 2 different places:
  1. Workspace analytics page, e.g. app.dub.co/dub/analytics
  2. Public stats page, e.g. dub.sh/stats/github, stey.me/stats/weathergpt
*/

import useWorkspace from "@/lib/swr/use-workspace";
import { useContext } from "react";
import AnalyticsProvider, {
  AnalyticsContext,
  AnalyticsDashboardProps,
} from "./analytics-provider";
import Devices from "./devices";
import Locations from "./locations";
import Main from "./main";
import Referer from "./referer";
import Toggle from "./toggle";
import TopLinks from "./top-links";

export default function Analytics({
  adminPage,
  demoPage,
  dashboardProps,
}: {
  adminPage?: boolean;
  demoPage?: boolean;
  dashboardProps?: AnalyticsDashboardProps;
}) {
  return (
    <AnalyticsProvider {...{ adminPage, demoPage, dashboardProps }}>
      <AnalyticsContext.Consumer>
        {({ dashboardProps }) => {
          return (
            <div className={cn("pb-10", dashboardProps && "bg-gray-50 pt-10")}>
              <Toggle />
              <div className="mx-auto grid max-w-screen-xl gap-5 px-3 lg:px-10">
                <Main />
                <StatsGrid />
              </div>
            </div>
          );
        }}
      </AnalyticsContext.Consumer>
    </AnalyticsProvider>
  );
}

function StatsGrid() {
  const { dashboardProps, partnerPage, selectedTab, view } =
    useContext(AnalyticsContext);
  const { plan } = useWorkspace();

  const hide =
    (selectedTab === "leads" || selectedTab === "sales" || view === "funnel") &&
    (plan === "free" || plan === "pro");

  return hide ? null : (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {!dashboardProps && !partnerPage && <TopLinks />}
      <Locations />
      <Devices />
      <Referer />
      {/* <Feedback /> */}
    </div>
  );
}
