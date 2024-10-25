"use client";
import { cn } from "@dub/utils";
/* 
  This Analytics component lives in 2 different places:
  1. Workspace analytics page, e.g. app.dub.co/dub/analytics
  2. Public stats page, e.g. dub.sh/stats/github, stey.me/stats/weathergpt
*/

import AnalyticsProvider, { AnalyticsContext } from "./analytics-provider";
import Devices from "./devices";
import Locations from "./locations";
import Main from "./main";
import Referer from "./referer";
import Toggle from "./toggle";
import TopLinks from "./top-links";

export default function Analytics({
  adminPage,
  demoPage,
  sharedDashboardProps,
}: {
  adminPage?: boolean;
  demoPage?: boolean;
  sharedDashboardProps?: {
    domain: string;
    key: string;
    url: string;
    showConversions?: boolean;
  };
}) {
  return (
    <AnalyticsProvider {...{ adminPage, demoPage, sharedDashboardProps }}>
      <AnalyticsContext.Consumer>
        {({ isSharedDashboard }) => {
          return (
            <div
              className={cn("pb-10", isSharedDashboard && "bg-gray-50 pt-10")}
            >
              <Toggle />
              <div className="mx-auto grid max-w-screen-xl gap-5 px-3 lg:px-10">
                <Main />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <TopLinks />
                  <Locations />
                  <Devices />
                  <Referer />
                  {/* <Feedback /> */}
                </div>
              </div>
            </div>
          );
        }}
      </AnalyticsContext.Consumer>
    </AnalyticsProvider>
  );
}
