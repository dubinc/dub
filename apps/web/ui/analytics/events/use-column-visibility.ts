import { useLocalStorage, useRouterStuff } from "@dub/ui";
import { VisibilityState } from "@tanstack/react-table";

const eventTypes = ["clicks", "leads", "sales"] as const;
type EventType = (typeof eventTypes)[number];

export const eventColumns: Record<
  EventType,
  { all: string[]; defaultVisible: string[] }
> = {
  clicks: {
    all: [
      "trigger",
      "link",
      "country",
      "city",
      "device",
      "browser",
      "os",
      "timestamp",
    ],
    defaultVisible: ["trigger", "link", "country", "device", "timestamp"],
  },
  leads: {
    all: [
      "event",
      "link",
      "customer",
      "country",
      "city",
      "device",
      "browser",
      "os",
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
      "country",
      "city",
      "device",
      "browser",
      "os",
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
  const { searchParams } = useRouterStuff();
  const tab = eventTypes.find((t) => t === searchParams.get("tab")) || "clicks";

  const [columnVisibility, setColumnVisibility] = useLocalStorage<
    Record<EventType, VisibilityState>
  >("events-columns", {
    clicks: getDefaultColumnVisibility("clicks"),
    leads: getDefaultColumnVisibility("leads"),
    sales: getDefaultColumnVisibility("sales"),
  });

  return {
    tab,
    columnVisibility,
    setColumnVisibility: (tab, visibility) =>
      setColumnVisibility({ ...columnVisibility, [tab]: visibility }),
  };
}
