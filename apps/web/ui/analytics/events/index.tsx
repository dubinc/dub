"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import EmptyState from "@/ui/shared/empty-state";
import { Menu3 } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useContext } from "react";
import AnalyticsProvider, { AnalyticsContext } from "../analytics-provider";
import Toggle from "../toggle";
import EventsTable from "./events-table";
import EventsTabs from "./events-tabs";

export default function AnalyticsEvents({
  staticDomain,
  staticUrl,
  adminPage,
}: {
  staticDomain?: string;
  staticUrl?: string;
  adminPage?: boolean;
}) {
  return (
    <AnalyticsProvider {...{ staticDomain, staticUrl, adminPage }}>
      <div className="pb-10">
        <Toggle page="events" />
        <AnalyticsContext.Consumer>
          {({ dashboardProps }) => (
            <div
              className={cn(
                "mx-auto flex max-w-screen-xl flex-col gap-3 px-3 lg:px-10",
                // TODO: [PageContent] Remove once all pages are migrated to the new PageContent
                !dashboardProps && !adminPage && "lg:px-6",
              )}
            >
              <EventsTabs />
              <EventsTableContainer />
            </div>
          )}
        </AnalyticsContext.Consumer>
      </div>
    </AnalyticsProvider>
  );
}

function EventsTableContainer() {
  const { selectedTab } = useContext(AnalyticsContext);
  const { plan, slug } = useWorkspace();

  const requiresUpgrade = plan === "free" || plan === "pro";

  return (
    <EventsTable
      key={selectedTab}
      requiresUpgrade={requiresUpgrade}
      upgradeOverlay={
        <EmptyState
          icon={Menu3}
          title="Real-time Events Stream"
          description={`Want more data on your link ${selectedTab === "clicks" ? "clicks & QR code scans" : selectedTab}? Upgrade to our Business Plan to get a detailed, real-time stream of events in your workspace.`}
          learnMore="https://d.to/events"
          buttonText="Upgrade to Business"
          buttonLink={`/${slug}/upgrade`}
        />
      }
    />
  );
}
