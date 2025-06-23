import { useLocalStorage } from "@dub/ui";
import { VisibilityState } from "@tanstack/react-table";

export const partnersColumns = {
  all: [
    "partner",
    "createdAt",
    "status",
    "location",
    "clicks",
    "leads",
    "sales",
    "saleAmount",
    "totalCommissions",
    "netRevenue",
  ],
  defaultVisible: [
    "partner",
    "createdAt",
    "location",
    "clicks",
    "leads",
    "sales",
    "saleAmount",
    "totalCommissions",
  ],
};

export function useColumnVisibility() {
  const [columnVisibility, setColumnVisibility] =
    useLocalStorage<VisibilityState>(
      "partners-table-columns",
      Object.fromEntries(
        partnersColumns.all.map((id) => [
          id,
          partnersColumns.defaultVisible.includes(id),
        ]),
      ),
    );

  return {
    columnVisibility,
    setColumnVisibility,
  };
}
