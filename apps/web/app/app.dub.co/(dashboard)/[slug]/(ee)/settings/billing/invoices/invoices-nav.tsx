"use client";

import { isProductionEnvironment } from "@/lib/sandbox/environment";
import useWorkspace from "@/lib/swr/use-workspace";
import { PageNavTabs } from "@/ui/layout/page-nav-tabs";
import { CreditCard, Globe, Icon, MoneyBills2, useRouterStuff } from "@dub/ui";

export const INVOICE_TABS = [
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "partnerPayout", label: "Partner payouts", icon: MoneyBills2 },
  { id: "domainRenewal", label: "Domain renewals", icon: Globe },
] as const satisfies {
  id: string;
  label: string;
  icon: Icon;
}[];

export type InvoiceTypeId = (typeof INVOICE_TABS)[number]["id"];

export function getVisibleInvoiceTabs(isProduction: boolean) {
  return isProduction
    ? INVOICE_TABS
    : INVOICE_TABS.filter((tab) => tab.id === "partnerPayout");
}

export function resolveInvoiceType(
  type: string | null | undefined,
  isProduction: boolean,
): InvoiceTypeId {
  const visibleTabs = getVisibleInvoiceTabs(isProduction);

  return visibleTabs.find((tab) => tab.id === type)?.id ?? visibleTabs[0].id;
}

export function InvoicesNav() {
  const { slug, environment, loading } = useWorkspace();
  const { getQueryString, searchParams } = useRouterStuff();
  const basePath = `/${slug}/settings/billing/invoices`;
  const isProduction = isProductionEnvironment(environment);

  if (loading || !environment) {
    return <div className="h-12" />;
  }

  const selectedId = resolveInvoiceType(
    searchParams.get("type"),
    isProduction,
  );

  return (
    <PageNavTabs
      basePath={basePath}
      tabs={getVisibleInvoiceTabs(isProduction).map((tab) => ({
        ...tab,
        href: `${basePath}${getQueryString({ type: tab.id })}`,
        selected: tab.id === selectedId,
      }))}
    />
  );
}
