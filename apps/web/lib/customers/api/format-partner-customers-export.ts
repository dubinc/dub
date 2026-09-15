import { obfuscateCustomerEmail } from "@/lib/api/partner-profile/obfuscate-customer-email";
import { formatMoneyCentsForExport } from "@/lib/api/utils/format-money-cents-for-export";
import { generateRandomName } from "@/lib/names";
import {
  PARTNER_CUSTOMER_EXPORT_COLUMNS,
  PARTNER_CUSTOMER_EXPORT_DEFAULT_COLUMNS,
} from "@/lib/zod/schemas/partner-profile";
import { toCentsNumber } from "@dub/utils";

export type PartnerCustomerForExport = {
  id: string;
  name: string | null;
  email: string | null;
  country: string | null;
  saleAmount: number | bigint | null;
  createdAt: Date;
  subscriptionCanceledAt: Date | null;
  link?: { shortLink: string; url: string } | null;
  commissions?: { createdAt: Date }[];
};

const dateToIso = (d: Date | null | undefined) => (d ? d.toISOString() : "");

const columnOrderById = new Map<string, number>(
  PARTNER_CUSTOMER_EXPORT_COLUMNS.map((col) => [col.id, col.order]),
);

export function formatPartnerCustomersForExport(
  customers: PartnerCustomerForExport[],
  columns: string[] = PARTNER_CUSTOMER_EXPORT_DEFAULT_COLUMNS,
  {
    customerDataSharingEnabledAt,
    ltvExcluded = false,
  }: {
    customerDataSharingEnabledAt: Date | null | undefined;
    ltvExcluded?: boolean;
  },
) {
  const allowedColumns = columns.filter((key) => {
    if (key === "name" && !customerDataSharingEnabledAt) {
      return false;
    }
    if (key === "saleAmount" && ltvExcluded) {
      return false;
    }
    return true;
  });

  const sortedColumns = [...allowedColumns].sort(
    (a, b) => (columnOrderById.get(a) ?? 999) - (columnOrderById.get(b) ?? 999),
  );

  return customers.map((c) => {
    const email = c.email
      ? customerDataSharingEnabledAt
        ? c.email
        : obfuscateCustomerEmail(c.email)
      : customerDataSharingEnabledAt
        ? c.name || generateRandomName()
        : generateRandomName();

    const full: Record<string, string | number> = {
      id: c.id,
      email,
      ...(customerDataSharingEnabledAt
        ? { name: c.name || c.email || "" }
        : {}),
      country: c.country ?? "",
      link: c.link?.shortLink ?? c.link?.url ?? "",
      createdAt: dateToIso(c.createdAt),
      firstSaleAt: dateToIso(c.commissions?.[0]?.createdAt),
      subscriptionCanceledAt: dateToIso(c.subscriptionCanceledAt),
      ...(!ltvExcluded
        ? {
            saleAmount: formatMoneyCentsForExport(
              toCentsNumber(c.saleAmount ?? 0),
              "USD",
              `customer ${c.id}`,
            ),
          }
        : {}),
    };

    return sortedColumns.reduce<Record<string, string | number>>((acc, key) => {
      if (key in full) acc[key] = full[key];
      return acc;
    }, {});
  });
}
