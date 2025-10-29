import { exportLinksColumns } from "@/lib/zod/schemas/links";
import { linkConstructor } from "@dub/utils";
import { transformLink } from "./utils";

const columnMap = exportLinksColumns.reduce(
  (acc, column, index) => {
    acc[column.id] = { ...column, order: index + 1 };
    return acc;
  },
  {} as Record<string, (typeof exportLinksColumns)[number] & { order: number }>,
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
    (a, b) => (columnMap[a]?.order || 999) - (columnMap[b]?.order || 999),
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

      const { label, transform } = columnMap[column];

      if (transform) {
        result[label] = transform(value);
      } else {
        result[label] = value;
      }
    });

    return result;
  });
}
