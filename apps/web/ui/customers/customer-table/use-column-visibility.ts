import { useLocalStorage } from "@dub/ui";
import { VisibilityState } from "@tanstack/react-table";

export const customersColumns = {
  all: ["customer", "country", "saleAmount", "createdAt", "link", "externalId"],
  defaultVisible: ["customer", "country", "saleAmount", "createdAt", "link"],
};

export function useColumnVisibility() {
  const [columnVisibility, setColumnVisibility] =
    useLocalStorage<VisibilityState>(
      "customers-table-columns",
      Object.fromEntries(
        customersColumns.all.map((id) => [
          id,
          customersColumns.defaultVisible.includes(id),
        ]),
      ),
    );

  return {
    columnVisibility,
    setColumnVisibility,
  };
}
