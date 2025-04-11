"use client";

import useCustomer from "@/lib/swr/use-customer";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  CommissionResponse,
  CustomerActivityResponse,
  CustomerEnriched,
  SaleEvent,
} from "@/lib/types";
import { CustomerActivityList } from "@/ui/customers/customer-activity-list";
import { CustomerDetailsColumn } from "@/ui/customers/customer-details-column";
import { CustomerPartnerEarningsTable } from "@/ui/customers/customer-partner-earnings-table";
import { CustomerSalesTable } from "@/ui/customers/customer-sales-table";
import { BackLink } from "@/ui/shared/back-link";
import { ArrowUpRight, CopyButton } from "@dub/ui";
import { DICEBEAR_AVATAR_URL, fetcher } from "@dub/utils";
import Link from "next/link";
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
  } = useCustomer<CustomerEnriched>({
    customerId,
    query: { includeExpandedFields: true },
  });

  const { data: customerActivity, isLoading: isCustomerActivityLoading } =
    useSWR<CustomerActivityResponse>(
      customer &&
        `/api/customers/${customer.id}/activity?workspaceId=${workspaceId}`,
      fetcher,
    );

  if (!customer && !isLoading && !error) notFound();

  return (
    <div className="mb-10 mt-2">
      <BackLink href={`/${slug}/customers`}>Customers</BackLink>
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
          <section className="flex flex-col">
            <h2 className="py-3 text-lg font-semibold text-neutral-900">
              Sales
            </h2>
            <SalesTable customerId={customerId} />
          </section>

          {customer?.programId && customer.partner && (
            <section className="flex flex-col">
              <h2 className="py-3 text-lg font-semibold text-neutral-900">
                Partner Earnings
              </h2>
              <div className="flex flex-col gap-4">
                <Link
                  href={`/${slug}/programs/${customer.programId}/partners?partnerId=${customer.partner.id}`}
                  target="_blank"
                  className="border-border-subtle group flex items-center justify-between overflow-hidden rounded-lg border bg-neutral-100 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {
                      <img
                        src={
                          customer.partner.image ||
                          `${DICEBEAR_AVATAR_URL}${customer.partner.name}`
                        }
                        alt={customer.partner.name}
                        className="size-8 rounded-full"
                      />
                    }
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-semibold leading-tight text-neutral-900">
                        {customer.partner.name}
                      </span>

                      {customer?.partner.email && (
                        <span className="block min-w-0 truncate text-xs font-medium leading-tight text-neutral-500">
                          {customer.partner.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight className="size-3 shrink-0 -translate-x-0.5 translate-y-0.5 opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
                </Link>
                <PartnerEarningsTable
                  programId={customer.programId}
                  customerId={customerId}
                />
              </div>
            </section>
          )}

          <section className="flex flex-col">
            <h2 className="py-3 text-lg font-semibold text-neutral-900">
              Activity
            </h2>
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

const PartnerEarningsTable = memo(
  ({ programId, customerId }: { programId: string; customerId: string }) => {
    const { id: workspaceId, slug } = useWorkspace();

    const { data: commissions, isLoading: isComissionsLoading } = useSWR<
      CommissionResponse[]
    >(
      `/api/programs/${programId}/commissions?customerId=${customerId}&workspaceId=${workspaceId}&pageSize=8`,
      fetcher,
    );

    const { data: totalCommissions, isLoading: isTotalCommissionsLoading } =
      useSWR<{ all: { count: number } }>(
        `/api/programs/${programId}/commissions/count?customerId=${customerId}&workspaceId=${workspaceId}`,
        fetcher,
      );

    return (
      <CustomerPartnerEarningsTable
        commissions={commissions}
        totalCommissions={totalCommissions?.all?.count}
        viewAllHref={`/${slug}/programs/${programId}/commissions?customerId=${customerId}`}
        isLoading={isComissionsLoading || isTotalCommissionsLoading}
      />
    );
  },
);
