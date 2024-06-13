"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
import { redirect } from "next/navigation";
import { Dispatch, SetStateAction, createContext, useState } from "react";
import AnalyticsProvider from "../analytics-provider";
import Toggle from "../toggle";
import EventsTable from "./events-table";
import EventsTabs from "./events-tabs";

export const EventsTableContext = createContext<{
  exportQueryString: string;
  setExportQueryString: Dispatch<SetStateAction<string>>;
}>({
  exportQueryString: "",
  setExportQueryString: () => {},
});

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
  const { slug, betaTester } = useWorkspace();
  const { searchParams } = useRouterStuff();
  const tab = searchParams.get("tab");

  const [exportQueryString, setExportQueryString] = useState<string>("");

  if (!betaTester) {
    redirect(`/${slug}/analytics`);
  }

  return (
    <AnalyticsProvider
      {...{ staticDomain, staticUrl, adminPage, demoPage }}
      eventsPage
    >
      <EventsTableContext.Provider
        value={{ exportQueryString, setExportQueryString }}
      >
        <div className="py-10">
          <Toggle page="events" />
          <div className="mx-auto flex max-w-screen-xl flex-col gap-5 px-2.5 lg:px-20">
            <EventsTabs />
            <EventsTable key={tab} />
          </div>
        </div>
      </EventsTableContext.Provider>
    </AnalyticsProvider>
  );
}
