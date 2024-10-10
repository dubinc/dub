"use client";

import { useRouterStuff } from "@dub/ui";
import AnalyticsProvider from "../analytics-provider";
import Toggle from "../toggle";
import EventsTable from "./events-table";
import EventsTabs from "./events-tabs";

export default function AnalyticsEvents({
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
  const { searchParams } = useRouterStuff();
  const event = searchParams.get("event");

  return (
    <AnalyticsProvider {...{ staticDomain, staticUrl, adminPage, demoPage }}>
      <div className="pb-10">
        <Toggle page="events" />
        <div className="mx-auto flex max-w-screen-xl flex-col gap-3 px-3 lg:px-10">
          <EventsTabs />
          <EventsTable key={event} />
        </div>
      </div>
    </AnalyticsProvider>
  );
}
