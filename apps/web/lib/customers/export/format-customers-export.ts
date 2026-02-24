import { generateRandomName } from "@/lib/names";
import {
  CUSTOMER_EXPORT_COLUMNS,
  CUSTOMER_EXPORT_DEFAULT_COLUMNS,
} from "./schema";
import type { CustomerForExport } from "./types";

const dateToIso = (d: Date | null) => (d ? d.toISOString() : "");

const COLUMN_ORDER = new Map<string, number>(
  CUSTOMER_EXPORT_COLUMNS.map((col, i) => [col.id, i + 1]),
);

export function formatCustomersForExport(
  customers: CustomerForExport[],
  columns: string[] = CUSTOMER_EXPORT_DEFAULT_COLUMNS,
) {
  const sortedColumns = [...columns].sort(
    (a, b) => (COLUMN_ORDER.get(a) ?? 999) - (COLUMN_ORDER.get(b) ?? 999),
  );

  return customers.map((c) => {
    const partner = c.programEnrollment?.partner;
    const link = c.link;

    const full: Record<string, string | number> = {
      id: c.id,
      name: c.name || c.email || generateRandomName(),
      email: c.email ?? "",
      country: c.country ?? "",
      partner: partner?.name ?? partner?.id ?? "",
      link: link?.shortLink ?? link?.url ?? "",
      sales: c.sales ?? 0,
      saleAmount: c.saleAmount ?? 0,
      createdAt: dateToIso(c.createdAt),
      firstSaleAt: dateToIso(c.firstSaleAt),
      subscriptionCanceledAt: dateToIso(c.subscriptionCanceledAt),
      externalId: c.externalId ?? "",
      stripeCustomerId: c.stripeCustomerId ?? "",
    };

    return sortedColumns.reduce<Record<string, string | number>>((acc, key) => {
      if (key in full) acc[key] = full[key];
      return acc;
    }, {});
  });
}
