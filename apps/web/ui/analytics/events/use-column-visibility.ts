import { EventType } from "@/lib/analytics/types";
import { useLocalStorage } from "@dub/ui";
import { VisibilityState } from "@tanstack/react-table";

export const getEventColumns: (
  partners?: boolean,
) => Record<EventType, { all: string[]; defaultVisible: string[] }> = (
  partners,
) => ({
  clicks: {
    all: [
      "trigger",
      ...(!partners ? ["link"] : []),
      "continent",
      "country",
      "city",
      "device",
      "browser",
      "os",
      "referer",
      "refererUrl",
      "ip",
      "timestamp",
    ],
    defaultVisible: [
      "trigger",
      ...(!partners ? ["link"] : []),
      "country",
      "device",
      ...(partners ? ["refererUrl"] : []),
      "timestamp",
    ],
  },
  leads: {
    all: [
      "event",
      ...(!partners ? ["link"] : []),
      "customer",
      "continent",
      "country",
      "city",
      "device",
      "browser",
      "os",
      "referer",
      "refererUrl",
      "ip",
      "timestamp",
    ],
    defaultVisible: [
      "event",
      ...(!partners ? ["link"] : []),
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
      ...(!partners ? ["link", "invoiceId"] : []),
      "continent",
      "country",
      "city",
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
      "event",
      ...(!partners ? ["link"] : []),
      "customer",
      "country",
      "saleAmount",
      "timestamp",
    ],
  },
});

const getDefaultColumnVisibility = (tab: EventType, partners?: boolean) => {
  const columns = getEventColumns(partners)[tab];
  return Object.fromEntries(
    columns.all.map((id) => [id, columns.defaultVisible.includes(id)]),
  );
};

export function useColumnVisibility({
  partners,
}: {
  partners?: boolean;
} = {}) {
  const [columnVisibility, setColumnVisibility] = useLocalStorage<
    Record<EventType, VisibilityState>
  >("events-columns", {
    clicks: getDefaultColumnVisibility("clicks", partners),
    leads: getDefaultColumnVisibility("leads", partners),
    sales: getDefaultColumnVisibility("sales", partners),
  });

  return {
    columnVisibility,
    setColumnVisibility: (tab, visibility) =>
      setColumnVisibility({ ...columnVisibility, [tab]: visibility }),
  };
}
