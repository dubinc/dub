import { EventType } from "@/lib/analytics/types";
import { useLocalStorage } from "@dub/ui";
import { VisibilityState } from "@tanstack/react-table";

export const eventColumns = {
  clicks: {
    all: [
      "trigger",
      "link",
      "country",
      "city",
      "region",
      "continent",
      "device",
      "browser",
      "os",
      "referer",
      "refererUrl",
      "ip",
      "timestamp",
    ],
    defaultVisible: ["timestamp", "link", "referer", "country", "device"],
  },
  leads: {
    all: [
      "event",
      "link",
      "customer",
      "country",
      "city",
      "region",
      "continent",
      "device",
      "browser",
      "os",
      "referer",
      "refererUrl",
      "ip",
      "timestamp",
    ],
    defaultVisible: ["timestamp", "event", "link", "customer", "referer"],
  },
  sales: {
    all: [
      "event",
      "customer",
      "link",
      "invoiceId",
      "country",
      "city",
      "region",
      "continent",
      "device",
      "browser",
      "os",
      "referer",
      "refererUrl",
      "ip",
      "timestamp",
      "saleAmount",
    ],
    defaultVisible: [
      "timestamp",
      "saleAmount",
      "event",
      "customer",
      "referer",
      "link",
    ],
  },
};

const getDefaultColumnVisibility = (tab: EventType) => {
  const columns = eventColumns[tab];
  return Object.fromEntries(
    columns.all.map((id) => [id, columns.defaultVisible.includes(id)]),
  );
};

export function useColumnVisibility() {
  const [columnVisibility, setColumnVisibility] = useLocalStorage<
    Record<EventType, VisibilityState>
  >("events-table-columns", {
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
