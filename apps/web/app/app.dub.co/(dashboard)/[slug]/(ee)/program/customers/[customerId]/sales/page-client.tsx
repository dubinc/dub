"use client";

import { CUSTOMER_PAGE_EVENTS_LIMIT } from "@/lib/constants/misc";
import useCustomer from "@/lib/swr/use-customer";
import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerEnriched, SaleEvent } from "@/lib/types";
import { CustomerSalesTable } from "@/ui/customers/customer-sales-table";
import { fetcher } from "@dub/utils";
import { redirect, useParams } from "next/navigation";
import { memo } from "react";
import useSWR from "swr";

export function CustomerSalesPageClient() {
  const { customerId } = useParams<{ customerId: string }>();

  const { slug } = useWorkspace();
  const { data: customer, isLoading } = useCustomer<CustomerEnriched>({
    customerId,
    query: { includeExpandedFields: true },
  });

  if (!customer && !isLoading) redirect(`/${slug}/customers`);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">Sales</h2>
      <div className="border-border-subtle overflow-hidden rounded-lg border">
        <SalesTable customerId={customerId} />
      </div>
    </section>
  );
}

const SalesTable = memo(({ customerId }: { customerId: string }) => {
  const { id: workspaceId, slug } = useWorkspace();

  const { data: salesData, isLoading: isSalesLoading } = useSWR<SaleEvent[]>(
    `/api/events?event=sales&interval=all&limit=${CUSTOMER_PAGE_EVENTS_LIMIT}&customerId=${customerId}&workspaceId=${workspaceId}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { data: totalSales, isLoading: isTotalSalesLoading } = useSWR<{
    sales: number;
  }>(
    // Only fetch total sales count if the sales data is equal to the limit
    salesData?.length === CUSTOMER_PAGE_EVENTS_LIMIT &&
      `/api/analytics?event=sales&interval=all&groupBy=count&customerId=${customerId}&workspaceId=${workspaceId}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return (
    <CustomerSalesTable
      sales={salesData}
      totalSales={
        isTotalSalesLoading ? undefined : totalSales?.sales ?? salesData?.length
      }
      viewAllHref={`/${slug}/events?event=sales&interval=all&customerId=${customerId}`}
      isLoading={isSalesLoading}
    />
  );
});
