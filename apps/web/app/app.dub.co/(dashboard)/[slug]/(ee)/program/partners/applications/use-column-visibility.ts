import { useLocalStorage } from "@dub/ui";
import { VisibilityState } from "@tanstack/react-table";

export const applicationsColumns = {
  all: [
    "partner",
    "createdAt",
    "location",
    "website",
    "youtube",
    "twitter",
    "linkedin",
    "instagram",
    "tiktok",
  ],
  defaultVisible: [
    "partner",
    "createdAt",
    "location",
    "website",
    "youtube",
    "linkedin",
  ],
};

export function useColumnVisibility() {
  const [columnVisibility, setColumnVisibility] =
    useLocalStorage<VisibilityState>(
      "applications-table-columns",
      Object.fromEntries(
        applicationsColumns.all.map((id) => [
          id,
          applicationsColumns.defaultVisible.includes(id),
        ]),
      ),
    );

  return {
    columnVisibility,
    setColumnVisibility,
  };
}
