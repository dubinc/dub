import { ClickEvent, LeadEvent, SaleEvent } from "@/lib/types";
import { COUNTRIES } from "@dub/utils";

export type Row = ClickEvent | LeadEvent | SaleEvent;

export const eventsExportColumnNames: Record<string, string> = {
  trigger: "Event",
  url: "Destination URL",
  os: "OS",
  referer: "Referrer",
  refererUrl: "Referrer URL",
  timestamp: "Date",
  invoiceId: "Invoice ID",
  saleAmount: "Sale Amount",
  clickId: "Click ID",
};

export const eventsExportColumnAccessors = {
  trigger: (r: Row) => r.click.trigger,
  event: (r: LeadEvent | SaleEvent) => r.eventName,
  url: (r: ClickEvent) => r.click.url,
  link: (r: Row) => r.domain + (r.key === "_root" ? "" : `/${r.key}`),
  country: (r: Row) =>
    r.country ? COUNTRIES[r.country] ?? r.country : r.country,
  referer: (r: ClickEvent) => r.click.referer,
  refererUrl: (r: ClickEvent) => r.click.refererUrl,
  customer: (r: LeadEvent | SaleEvent) =>
    r.customer.name + (r.customer.email ? ` <${r.customer.email}>` : ""),
  invoiceId: (r: Row) => ("sale" in r ? r.sale.invoiceId : ""),
  saleAmount: (r: Row) =>
    "sale" in r ? "$" + (r.sale.amount / 100).toFixed(2) : "",
  clickId: (r: ClickEvent) => r.click.id,
};
