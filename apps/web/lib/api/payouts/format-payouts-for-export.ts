import { formatMoneyCentsForExport } from "@/lib/api/utils/format-money-cents-for-export";
import { PAYOUT_EXPORT_COLUMNS } from "@/lib/zod/schemas/payouts";
import * as z from "zod/v4";
import { getPayouts } from "./get-payouts";

const COLUMN_LOOKUP: Map<
  string,
  { label: string; type: string; order: number }
> = new Map(
  PAYOUT_EXPORT_COLUMNS.map((column, index) => [
    column.id,
    {
      label: column.label,
      type: column.type,
      order: index + 1,
    },
  ]),
);

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
  date: z
    .union([z.date(), z.string()])
    .nullable()
    .transform((date) => {
      if (!date) {
        return "";
      }

      return date instanceof Date ? date.toISOString() : date;
    }),
  string: z
    .string()
    .nullable()
    .default("")
    .transform((value) => value || ""),
};

export function formatPayoutsForExport(
  payouts: Awaited<ReturnType<typeof getPayouts>>,
  columns: string[],
): Record<string, any>[] {
  const sortedColumns = [...columns].sort(
    (a, b) =>
      (COLUMN_LOOKUP.get(a)?.order || 999) -
      (COLUMN_LOOKUP.get(b)?.order || 999),
  );

  const formattedPayouts = payouts.map((payout) => {
    const row: Record<string, unknown> = {
      id: payout.id,
      invoiceId: payout.invoiceId,
      amount: formatMoneyCentsForExport(
        payout.amount,
        payout.currency,
        `payout ${payout.id}`,
      ),
      currency: payout.currency,
      status: payout.status,
      description: payout.description,
      periodStart: payout.periodStart,
      periodEnd: payout.periodEnd,
      initiatedAt: payout.initiatedAt,
      paidAt: payout.paidAt,
      method: payout.method,
      traceId: payout.traceId,
      failureReason: payout.failureReason,
      partnerId: payout.partner.id,
      partnerName: payout.partner.name,
      partnerEmail: payout.partner.email,
      partnerTenantId: payout.partner.tenantId,
    };

    return row;
  });

  const columnSchemas: Record<string, z.ZodTypeAny> = {};

  for (const column of sortedColumns) {
    const columnInfo = COLUMN_LOOKUP.get(column);

    if (!columnInfo) {
      continue;
    }

    columnSchemas[column] =
      COLUMN_TYPE_SCHEMAS[columnInfo.type as keyof typeof COLUMN_TYPE_SCHEMAS];
  }

  return z.array(z.object(columnSchemas)).parse(formattedPayouts);
}
