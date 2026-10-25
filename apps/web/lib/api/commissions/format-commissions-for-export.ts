import { sanitizeTimezone } from "@/lib/analytics/utils/sanitize-timezone";
import { formatMoneyCentsForExport } from "@/lib/api/utils/format-money-cents-for-export";
import { COMMISSION_EXPORT_COLUMNS } from "@/lib/zod/schemas/commissions";
import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import * as z from "zod/v4";
import { getCommissions } from "./get-commissions";

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
  money: z
    .string()
    .nullable()
    .default("")
    .transform((value) => value || ""),
  string: z
    .string()
    .nullable()
    .default("")
    .transform((value) => value || ""),
};

// Wall-clock time in the export timezone. toISOString() is UTC, so a commission
// at 2026-10-08 06:59 in Asia/Shanghai was exported as 2026-10-07 22:59:59.
function exportDateSchema(timezone?: string) {
  const zone = tz(sanitizeTimezone(timezone));

  return z
    .date()
    .nullable()
    .transform((date) =>
      date ? format(date, "yyyy-MM-dd HH:mm:ss", { in: zone }) : "",
    );
}

// Formats commissions for CSV export with proper column ordering and type coercion
export function formatCommissionsForExport(
  commissions: Awaited<ReturnType<typeof getCommissions>>,
  columns: string[],
  timezone?: string,
): Record<string, any>[] {
  const sortedColumns = [...columns].sort(
    (a, b) =>
      (COLUMN_LOOKUP.get(a)?.order || 999) -
      (COLUMN_LOOKUP.get(b)?.order || 999),
  );

  const formattedCommissions = commissions.map((commission) => {
    const row: Record<string, unknown> = {
      ...commission,
      paidAt: commission.payout?.paidAt ?? null,
      customerName: commission.customer?.name || "",
      customerEmail: commission.customer?.email || "",
      customerExternalId: commission.customer?.externalId || "",
      stripeCustomerId: commission.customer?.stripeCustomerId || "",
      partnerName: commission.partner?.name || "",
      partnerEmail: commission.partner?.email || "",
      partnerTenantId: commission.programEnrollment?.tenantId || "",
    };

    for (const col of sortedColumns) {
      const columnInfo = COLUMN_LOOKUP.get(col);
      if (columnInfo?.type !== "money") {
        continue;
      }

      const cents = commission[col as "amount" | "earnings"];
      if (typeof cents === "number") {
        row[col] = formatMoneyCentsForExport(
          cents,
          commission.currency,
          `commission ${commission.id}`,
        );
      }
    }

    return row;
  });

  const columnSchemas: Record<string, z.ZodTypeAny> = {};

  for (const column of sortedColumns) {
    const columnInfo = COLUMN_LOOKUP.get(column);

    if (!columnInfo) {
      continue;
    }

    columnSchemas[column] =
      columnInfo.type === "date"
        ? exportDateSchema(timezone)
        : COLUMN_TYPE_SCHEMAS[
            columnInfo.type as keyof typeof COLUMN_TYPE_SCHEMAS
          ];
  }

  return z.array(z.object(columnSchemas)).parse(formattedCommissions);
}
