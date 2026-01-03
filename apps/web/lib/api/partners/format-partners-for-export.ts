import { exportPartnerColumns } from "@/lib/zod/schemas/partners";
import * as z from "zod/v4";

const columnIdToLabel = exportPartnerColumns.reduce(
  (acc, column) => {
    acc[column.id] = column.label;
    return acc;
  },
  {} as Record<string, string>,
);

const numericColumns = exportPartnerColumns
  .filter((column) => column.numeric)
  .map((column) => column.id);

const dateColumns = ["createdAt", "payoutsEnabledAt"];

// Formats partners for CSV export with proper column ordering, type coercion, and date handling
export function formatPartnersForExport(
  partners: any[],
  columns: string[],
): Record<string, any>[] {
  // Sort columns according to schema order
  const columnOrderMap = exportPartnerColumns.reduce(
    (acc, column, index) => {
      acc[column.id] = index + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const sortedColumns = columns.sort(
    (a, b) => (columnOrderMap[a] || 999) - (columnOrderMap[b] || 999),
  );

  // Create schema for validation
  const schemaFields: Record<string, any> = {};
  sortedColumns.forEach((column) => {
    if (numericColumns.includes(column)) {
      schemaFields[columnIdToLabel[column]] = z.coerce
        .number()
        .optional()
        .default(0);
    } else {
      schemaFields[columnIdToLabel[column]] = z.string().optional().default("");
    }
  });

  const validationSchema = z.object(schemaFields);

  // Format each partner
  return partners.map((partner) => {
    const result: Record<string, any> = {};

    sortedColumns.forEach((column) => {
      let value = partner[column] || "";

      // Handle date fields - convert to ISO string format
      if (dateColumns.includes(column) && value instanceof Date) {
        value = value.toISOString();
      }

      result[columnIdToLabel[column]] = value;
    });

    return validationSchema.parse(result);
  });
}
