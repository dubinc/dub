"use client";

import useCustomer from "@/lib/swr/use-customer";
import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerActivityResponse, SaleEvent } from "@/lib/types";
import { CustomerActivityList } from "@/ui/customers/customer-activity-list";
import { CustomerDetailsColumn } from "@/ui/customers/customer-details-column";
import { CustomerSalesTable } from "@/ui/customers/customer-sales-table";
import { BackLink } from "@/ui/shared/back-link";
import { CopyButton } from "@dub/ui";
import { DICEBEAR_AVATAR_URL, fetcher } from "@dub/utils";
import { notFound, useParams } from "next/navigation";
import { memo } from "react";
import useSWR from "swr";

export function CustomerPageClient() {
  const { customerId } = useParams<{ customerId: string }>();

  const { id: workspaceId, slug } = useWorkspace();
  const {
    data: customer,
    isLoading,
    error,
  } = useCustomer({
    customerId,
    query: { includeExpandedFields: true },
  });

  let { data: customerActivity, isLoading: isCustomerActivityLoading } =
    useSWR<CustomerActivityResponse>(
      customer &&
        `/api/customers/${customer.id}/activity?workspaceId=${workspaceId}`,
      fetcher,
    );

  if (!customer && !isLoading && !error) notFound();

  return (
    <div className="mb-10 mt-2">
      <BackLink href={`/${slug}/events`}>Events</BackLink>
      <div className="mt-5 flex items-center gap-4">
        {customer ? (
          <img
            src={customer.avatar || `${DICEBEAR_AVATAR_URL}${customer.name}`}
            alt={customer.name}
            className="size-12 rounded-full"
          />
        ) : (
          <div className="size-12 animate-pulse rounded-full bg-neutral-200" />
        )}
        <div className="flex flex-col gap-1">
          {customer ? (
            <h1 className="text-base font-semibold leading-tight text-neutral-900">
              {customer.name}
            </h1>
          ) : (
            <div className="h-5 w-32 animate-pulse rounded-md bg-neutral-200" />
          )}

          {customer ? (
            customer.email && (
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-neutral-500">
                  {customer.email}
                </span>
                <CopyButton
                  value={customer.email}
                  variant="neutral"
                  className="p-1 [&>*]:h-3 [&>*]:w-3"
                  successMessage="Copied email to clipboard!"
                />
              </div>
            )
          ) : (
            <div className="h-5 w-24 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 items-start gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* Main content */}
        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-neutral-900">Sales</h2>
            <SalesTable customerId={customerId} />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-neutral-900">Activity</h2>
            <CustomerActivityList
              activity={customerActivity}
              isLoading={!customer || isCustomerActivityLoading}
            />
          </section>
        </div>

        {/* Right side details */}
        <div className="-order-1 lg:order-1">
          <CustomerDetailsColumn
            customer={customer}
            customerActivity={customerActivity}
            isCustomerActivityLoading={!customer || isCustomerActivityLoading}
            workspaceSlug={slug}
          />
        </div>
      </div>
    </div>
  );
}

const SalesTable = memo(({ customerId }: { customerId: string }) => {
  const { id: workspaceId, slug } = useWorkspace();

  const { data: salesData, isLoading: isSalesLoading } = useSWR<SaleEvent[]>(
    `/api/events?event=sales&interval=all&limit=8&customerId=${customerId}&workspaceId=${workspaceId}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { data: totalSales, isLoading: isTotalSalesLoading } = useSWR<{
    sales: number;
  }>(
    `/api/analytics?event=sales&interval=all&groupBy=count&customerId=${customerId}&workspaceId=${workspaceId}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return (
    <CustomerSalesTable
      sales={salesData}
      totalSales={totalSales?.sales}
      viewAllHref={`/${slug}/events?event=sales&interval=all&customerId=${customerId}`}
      isLoading={isSalesLoading || isTotalSalesLoading}
    />
  );
});
