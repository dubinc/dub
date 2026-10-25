import { formatMoneyCentsForExport } from "@/lib/api/utils/format-money-cents-for-export";
import {
  CUSTOMER_EXPORT_COLUMNS,
  CUSTOMER_EXPORT_DEFAULT_COLUMNS,
} from "@/lib/zod/schemas/customers";
import { toCentsNumber } from "@dub/utils";
import type { Customer, Link } from "@prisma/client";

type CustomerForExport = Customer & {
  link?: Pick<Link, "shortLink" | "url"> | null;
};

const dateToIso = (d: Date | null) => (d ? d.toISOString() : "");

const columnOrderById = new Map<string, number>(
  CUSTOMER_EXPORT_COLUMNS.map((col) => [col.id, col.order]),
);

export function formatCustomersForExport(
  customers: CustomerForExport[],
  columns: string[] = CUSTOMER_EXPORT_DEFAULT_COLUMNS,
) {
  const sortedColumns = [...columns].sort(
    (a, b) => (columnOrderById.get(a) ?? 999) - (columnOrderById.get(b) ?? 999),
  );

  return customers.map((c) => {
    const link = c.link;

    const full: Record<string, string | number> = {
      id: c.id,
      name: c.name || c.email || "",
      email: c.email ?? "",
      avatar: c.avatar ?? "",
      externalId: c.externalId ?? "",
      stripeCustomerId: c.stripeCustomerId ?? "",
      country: c.country ?? "",
      sales: c.sales ?? 0,
      saleAmount: formatMoneyCentsForExport(
        toCentsNumber(c.saleAmount ?? 0),
        "USD",
        `customer ${c.id}`,
      ),
      createdAt: dateToIso(c.createdAt),
      firstSaleAt: dateToIso(c.firstSaleAt),
      subscriptionCanceledAt: dateToIso(c.subscriptionCanceledAt),
      link: link?.shortLink ?? link?.url ?? "",
    };

    return sortedColumns.reduce<Record<string, string | number>>((acc, key) => {
      if (key in full) acc[key] = full[key];
      return acc;
    }, {});
  });
}
