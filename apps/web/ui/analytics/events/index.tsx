"use client";

import AnalyticsProvider from "../analytics-provider";
import Toggle from "../toggle";
import EventsTable from "./events-table";

export default function AnalyticsEvents({
  staticDomain,
  staticUrl,
  admin,
  demo,
}: {
  staticDomain?: string;
  staticUrl?: string;
  admin?: boolean;
  demo?: boolean;
}) {
  return (
    <AnalyticsProvider {...{ staticDomain, staticUrl, admin, demo }}>
      <div className="pb-3 pt-10">
        <Toggle heading="Events" />
      </div>
      <div className="mx-auto grid max-w-screen-xl gap-5 px-2.5 lg:px-20">
        <EventsTable />
      </div>
    </AnalyticsProvider>
  );
}
