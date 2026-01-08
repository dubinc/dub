"use client";

import { CUSTOMER_PAGE_EVENTS_LIMIT } from "@/lib/constants/misc";
import useCustomer from "@/lib/swr/use-customer";
import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionResponse, CustomerEnriched } from "@/lib/types";
import { CustomerPartnerEarningsTable } from "@/ui/customers/customer-partner-earnings-table";
import { ArrowUpRight } from "@dub/ui";
import { OG_AVATAR_URL, fetcher } from "@dub/utils";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";
import { memo } from "react";
import useSWR from "swr";

export function CustomerEarningsPageClient() {
  const { customerId } = useParams<{ customerId: string }>();

  const { slug } = useWorkspace();
  const { data: customer, isLoading } = useCustomer<CustomerEnriched>({
    customerId,
    query: { includeExpandedFields: true },
  });

  if (!customer && !isLoading) redirect(`/${slug}/customers`);

  return !customer || (customer.partner && customer.programId) ? (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">
        Partner earnings
      </h2>
      <div className="border-border-subtle flex flex-col overflow-hidden rounded-lg border">
        <Link
          href={`/${slug}/program/partners/${customer?.partner?.id}`}
          target="_blank"
          className="group flex items-center justify-between overflow-hidden bg-neutral-100 px-3 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-3">
            {customer?.partner ? (
              <>
                <img
                  src={
                    customer?.partner?.image ||
                    `${OG_AVATAR_URL}${customer?.partner?.name}`
                  }
                  alt={customer.partner.name}
                  className="size-5 rounded-full"
                />
                <span className="block min-w-0 truncate text-sm font-medium text-neutral-900">
                  {customer.partner.name}
                </span>
              </>
            ) : (
              <>
                <div className="size-5 animate-pulse rounded-full bg-neutral-200" />
                <div className="h-5 w-24 animate-pulse rounded bg-neutral-200" />
              </>
            )}
          </div>
          <ArrowUpRight className="size-3 shrink-0 -translate-x-0.5 translate-y-0.5 opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
        </Link>

        <div className="border-border-subtle border-t">
          <PartnerEarningsTable customerId={customerId} />
        </div>
      </div>
    </section>
  ) : null;
}

const PartnerEarningsTable = memo(({ customerId }: { customerId: string }) => {
  const { id: workspaceId, slug } = useWorkspace();

  const { data: commissions, isLoading: isComissionsLoading } = useSWR<
    CommissionResponse[]
  >(
    `/api/commissions?${new URLSearchParams({
      customerId,
      workspaceId: workspaceId!,
      pageSize: CUSTOMER_PAGE_EVENTS_LIMIT.toString(),
    })}`,
    fetcher,
  );

  const { data: totalCommissions, isLoading: isTotalCommissionsLoading } =
    useSWR<{ all: { count: number } }>(
      // Only fetch total earnings count if the earnings data is equal to the limit
      commissions?.length === CUSTOMER_PAGE_EVENTS_LIMIT &&
        `/api/commissions/count?${new URLSearchParams({
          customerId,
          workspaceId: workspaceId!,
        })}`,
      fetcher,
    );

  return (
    <CustomerPartnerEarningsTable
      commissions={commissions}
      totalCommissions={
        isTotalCommissionsLoading
          ? undefined
          : totalCommissions?.all?.count ?? commissions?.length
      }
      viewAllHref={`/${slug}/program/commissions?customerId=${customerId}`}
      isLoading={isComissionsLoading}
    />
  );
});
