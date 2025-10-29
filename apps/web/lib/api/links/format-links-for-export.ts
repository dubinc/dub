import { exportLinksColumns } from "@/lib/zod/schemas/links";
import { linkConstructor } from "@dub/utils";
import { transformLink } from "./utils";

const columnIdToLabel = exportLinksColumns.reduce(
  (acc, column) => {
    acc[column.id] = column.label;
    return acc;
  },
  {} as Record<string, string>,
);

const columnOrderMap = exportLinksColumns.reduce(
  (acc, column, index) => {
    acc[column.id] = index + 1;
    return acc;
  },
  {} as Record<string, number>,
);

export function formatLinksForExport(
  links: ReturnType<typeof transformLink>[],
  columns: string[],
): Record<string, any>[] {
  // Remove the columns that are not in exportLinksColumns
  columns = columns.filter((column) =>
    exportLinksColumns.some((c) => c.id === column),
  );

  const sortedColumns = columns.sort(
    (a, b) => (columnOrderMap[a] || 999) - (columnOrderMap[b] || 999),
  );

  // Format each link
  return links.map((link) => {
    const result: Record<string, any> = {};

    sortedColumns.forEach((column) => {
      let value: unknown;

      // Handle special cases before parsing
      if (column === "link") {
        value = linkConstructor({ domain: link.domain, key: link.key });
      } else if (column === "tags") {
        value = link.tags?.map((tag) => tag.name) || [];
      } else {
        value = link[column];
      }

      const parseFn = exportLinksColumns.find((c) => c.id === column);

      if (parseFn) {
        result[columnIdToLabel[column]] = parseFn.parse(value);
      } else {
        result[columnIdToLabel[column]] = value;
      }
    });

    return result;
  });
}
