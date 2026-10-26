"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PageNavTabs } from "@/ui/layout/page-nav-tabs";
import { CreditCard, Globe, Icon, useRouterStuff } from "@dub/ui";

export const INVOICE_TABS = [
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "domainRenewal", label: "Domain renewals", icon: Globe },
] as const satisfies {
  id: string;
  label: string;
  icon: Icon;
}[];

export type InvoiceTypeId = (typeof INVOICE_TABS)[number]["id"];

export function resolveInvoiceType(
  type: string | null | undefined,
): InvoiceTypeId {
  return INVOICE_TABS.find((tab) => tab.id === type)?.id ?? INVOICE_TABS[0].id;
}

export function InvoicesNav() {
  const { slug, loading } = useWorkspace();
  const { getQueryString, searchParams } = useRouterStuff();
  const basePath = `/${slug}/settings/billing/invoices`;

  if (loading) {
    return <div className="h-12" />;
  }

  const selectedId = resolveInvoiceType(searchParams.get("type"));

  return (
    <PageNavTabs
      basePath={basePath}
      tabs={INVOICE_TABS.map((tab) => ({
        ...tab,
        href: `${basePath}${getQueryString({ type: tab.id })}`,
        selected: tab.id === selectedId,
      }))}
    />
  );
}
