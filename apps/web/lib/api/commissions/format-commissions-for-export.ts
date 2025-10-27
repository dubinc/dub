import { COMMISSION_EXPORT_COLUMNS } from "@/lib/zod/schemas/commissions";
import { z } from "zod";

const COLUMN_LOOKUP: Map<
  string,
  { label: string; type: string; order: number }
> = new Map(
  COMMISSION_EXPORT_COLUMNS.map((column, index) => [
    column.id,
    {
      label: column.label,
      type: column.type,
      order: index + 1,
    },
  ]),
);

// Define the Zod schemas for each column type
const COLUMN_TYPE_SCHEMAS = {
  number: z.coerce
    .number()
    .nullable()
    .default(0)
    .transform((value) => value || 0),
  date: z.date().transform((date) => date?.toISOString() || ""),
  string: z
    .string()
    .nullable()
    .default("")
    .transform((value) => value || ""),
};

// Formats commissions for CSV export with proper column ordering and type coercion
export function formatCommissionsForExport(
  commissions: any[],
  columns: string[],
): Record<string, any>[] {
  const formattedCommissions = commissions.map((commission) => ({
    ...commission,
    customerName: commission.customer?.name || "",
    customerEmail: commission.customer?.email || "",
    customerExternalId: commission.customer?.externalId || "",
    partnerName: commission.partner?.name || "",
    partnerEmail: commission.partner?.email || "",
    partnerTenantId: commission.partner?.programs[0]?.tenantId || "",
  }));

  // Sort columns by their order
  const sortedColumns = columns.sort(
    (a, b) =>
      (COLUMN_LOOKUP.get(a)?.order || 999) -
      (COLUMN_LOOKUP.get(b)?.order || 999),
  );

  // Build column schemas
  const columnSchemas: Record<string, z.ZodTypeAny> = {};

  for (const column of sortedColumns) {
    const columnInfo = COLUMN_LOOKUP.get(column);

    if (!columnInfo) {
      continue;
    }

    columnSchemas[column] = COLUMN_TYPE_SCHEMAS[columnInfo.type];
  }

  return z.array(z.object(columnSchemas)).parse(formattedCommissions);
}
