import { EventType } from "@/lib/analytics/types";
import { useLocalStorage } from "@dub/ui";
import { VisibilityState } from "@tanstack/react-table";
import { useContext } from "react";
import { AnalyticsContext } from "../analytics-provider";

export const eventColumns: Record<
  EventType,
  { all: string[]; defaultVisible: string[] }
> = {
  clicks: {
    all: [
      "trigger",
      "link",
      "continent",
      "country",
      "city",
      "device",
      "browser",
      "os",
      "referer",
      "ip",
      "timestamp",
    ],
    defaultVisible: ["trigger", "link", "country", "device", "timestamp"],
  },
  leads: {
    all: [
      "event",
      "link",
      "customer",
      "continent",
      "country",
      "city",
      "device",
      "browser",
      "os",
      "referer",
      "ip",
      "timestamp",
    ],
    defaultVisible: [
      "event",
      "link",
      "customer",
      "country",
      "device",
      "timestamp",
    ],
  },
  sales: {
    all: [
      "event",
      "customer",
      "invoiceId",
      "link",
      "continent",
      "country",
      "city",
      "device",
      "browser",
      "os",
      "referer",
      "ip",
      "timestamp",
      "amount",
    ],
    defaultVisible: [
      "event",
      "link",
      "customer",
      "country",
      "amount",
      "timestamp",
    ],
  },
};

const getDefaultColumnVisibility = (tab: EventType) =>
  Object.fromEntries(
    eventColumns[tab].all.map((id) => [
      id,
      eventColumns[tab].defaultVisible.includes(id),
    ]),
  );

export function useColumnVisibility() {
  const { selectedTab } = useContext(AnalyticsContext);

  const [columnVisibility, setColumnVisibility] = useLocalStorage<
    Record<EventType, VisibilityState>
  >("events-columns", {
    clicks: getDefaultColumnVisibility("clicks"),
    leads: getDefaultColumnVisibility("leads"),
    sales: getDefaultColumnVisibility("sales"),
  });

  return {
    columnVisibility,
    setColumnVisibility: (tab, visibility) =>
      setColumnVisibility({ ...columnVisibility, [tab]: visibility }),
  };
}
