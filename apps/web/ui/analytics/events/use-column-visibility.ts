import { EventType } from "@/lib/analytics/types";
import { useLocalStorage } from "@dub/ui";
import { VisibilityState } from "@tanstack/react-table";

export const eventColumns = {
  clicks: {
    all: [
      "timestamp",
      "trigger",
      "link",
      "url",
      "country",
      "city",
      "region",
      "continent",
      "device",
      "browser",
      "os",
      "referer",
      "refererUrl",
      "clickId",
      "ip",
    ],
    defaultVisible: ["timestamp", "link", "referer", "country", "device"],
  },
  leads: {
    all: [
      "timestamp",
      "event",
      "link",
      "url",
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
      "clickId",
      "metadata",
    ],
    defaultVisible: ["timestamp", "event", "link", "customer", "referer"],
  },
  sales: {
    all: [
      "timestamp",
      "saleAmount",
      "event",
      "customer",
      "link",
      "url",
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
      "clickId",
      "metadata",
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
  const [columnVisibility, setColumnVisibilityState] = useLocalStorage<
    Record<EventType, VisibilityState>
  >("events-table-columns", {
    clicks: getDefaultColumnVisibility("clicks"),
    leads: getDefaultColumnVisibility("leads"),
    sales: getDefaultColumnVisibility("sales"),
  });

  return {
    columnVisibility,
    setColumnVisibility: (tab, visibility) => {
      // Ensure all columns for this tab are present in the new state
      const allColumns = eventColumns[tab].all;
      const currentTabState = columnVisibility[tab] || {};

      // Create a new state that preserves all columns, defaulting to false for missing ones
      const newTabState = Object.fromEntries(
        allColumns.map((columnId) => [
          columnId,
          visibility.hasOwnProperty(columnId)
            ? visibility[columnId]
            : currentTabState[columnId] ?? false,
        ]),
      );

      setColumnVisibilityState({ ...columnVisibility, [tab]: newTabState });
    },
  };
}
