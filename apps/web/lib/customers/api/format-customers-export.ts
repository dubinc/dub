import { generateRandomName } from "@/lib/names";
import type { Customer, Link, ProgramEnrollment } from "@dub/prisma/client";
import {
  CUSTOMER_EXPORT_COLUMNS,
  CUSTOMER_EXPORT_DEFAULT_COLUMNS,
} from "../schema";

type CustomerForExport = Customer & {
  link?: Pick<Link, "shortLink" | "url"> | null;
  programEnrollment?:
    | (ProgramEnrollment & {
        partner: {
          id: string;
          name: string | null;
          email: string | null;
          image: string | null;
        };
      })
    | null;
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
    const partner = c.programEnrollment?.partner;
    const link = c.link;

    const full: Record<string, string | number> = {
      id: c.id,
      name: c.name || c.email || generateRandomName(),
      email: c.email ?? "",
      avatar: c.avatar ?? "",
      externalId: c.externalId ?? "",
      stripeCustomerId: c.stripeCustomerId ?? "",
      country: c.country ?? "",
      sales: c.sales ?? 0,
      saleAmount: c.saleAmount ?? 0,
      createdAt: dateToIso(c.createdAt),
      firstSaleAt: dateToIso(c.firstSaleAt),
      subscriptionCanceledAt: dateToIso(c.subscriptionCanceledAt),
      link: link?.shortLink ?? link?.url ?? "",
      partnerId: partner?.id ?? "",
      partnerName: partner?.name ?? "",
      partnerEmail: partner?.email ?? "",
      partnerTenantId: c.programEnrollment?.tenantId ?? "",
    };

    return sortedColumns.reduce<Record<string, string | number>>((acc, key) => {
      if (key in full) acc[key] = full[key];
      return acc;
    }, {});
  });
}
