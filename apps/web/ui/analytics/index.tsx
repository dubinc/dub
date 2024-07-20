"use client";
/* 
  This Analytics component lives in 2 different places:
  1. Workspace analytics page, e.g. app.dub.co/dub/analytics
  2. Public stats page, e.g. dub.co/stats/github, stey.me/stats/weathergpt
*/

import AnalyticsProvider, { AnalyticsContext } from "./analytics-provider";
import Devices from "./devices";
import Locations from "./locations";
import Main from "./main";
import Referer from "./referer";
import Toggle from "./toggle";
import TopLinks from "./top-links";

export default function Analytics({
  staticDomain,
  staticUrl,
  adminPage,
  demoPage,
}: {
  staticDomain?: string;
  staticUrl?: string;
  adminPage?: boolean;
  demoPage?: boolean;
}) {
  return (
    <AnalyticsProvider {...{ staticDomain, staticUrl, adminPage, demoPage }}>
      <AnalyticsContext.Consumer>
        {({ basePath }) => {
          const isPublicStatsPage = basePath.startsWith("/stats");
          return (
            <div className="bg-gray-50 py-10">
              <Toggle />
              <div className="mx-auto grid max-w-screen-xl gap-5 px-2.5 lg:px-20">
                <Main />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {!isPublicStatsPage && <TopLinks />}
                  <Locations />
                  <Devices />
                  <Referer />
                  {isPublicStatsPage && <TopLinks />}
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
