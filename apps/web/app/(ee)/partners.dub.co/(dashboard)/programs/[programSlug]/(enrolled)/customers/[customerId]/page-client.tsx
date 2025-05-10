"use client";

import { CUSTOMER_PAGE_EVENTS_LIMIT } from "@/lib/partners/constants";
import usePartnerCustomer from "@/lib/swr/use-partner-customer";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerEarningsResponse } from "@/lib/types";
import { CustomerActivityList } from "@/ui/customers/customer-activity-list";
import { CustomerDetailsColumn } from "@/ui/customers/customer-details-column";
import { CustomerSalesTable } from "@/ui/customers/customer-sales-table";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import { BackLink } from "@/ui/shared/back-link";
import { Button, MoneyBill2, Tooltip } from "@dub/ui";
import { fetcher, OG_AVATAR_URL } from "@dub/utils";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { memo } from "react";
import useSWR from "swr";

export function ProgramCustomerPageClient() {
  const { programEnrollment } = useProgramEnrollment();
  const { programSlug, customerId } = useParams<{
    programSlug: string;
    customerId: string;
  }>();

  const { data: customer, isLoading } = usePartnerCustomer({
    customerId,
  });

  if (!customer && !isLoading) notFound();

  return (
    <div className="mb-10 mt-2">
      <BackLink href={`/programs/${programSlug}/earnings`}>Earnings</BackLink>
      <div className="mt-5 flex items-center gap-4">
        {customer ? (
          <img
            src={`${OG_AVATAR_URL}${customer.id}`}
            alt={customer.email ?? customer.id}
            className="size-8 rounded-full"
          />
        ) : (
          <div className="size-8 animate-pulse rounded-full bg-neutral-200" />
        )}

        <div className="flex flex-col gap-1">
          {customer ? (
            customer.email && (
              <span className="text-sm font-medium text-neutral-500">
                {customer.email}
              </span>
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
            <div className="flex items-center justify-between">
              <h2 className="py-3 text-lg font-semibold text-neutral-900">
                Earnings
              </h2>
              {programEnrollment?.rewards && (
                <Tooltip
                  content={
                    <div>
                      <ProgramRewardList
                        rewards={programEnrollment?.rewards}
                        className="gap-2 border-none p-3"
                      />
                    </div>
                  }
                >
                  <div className="border-border-subtle flex size-8 items-center justify-center rounded-full border hover:bg-neutral-50">
                    <MoneyBill2 className="size-4 text-neutral-800" />
                  </div>
                </Tooltip>
              )}
            </div>
            <EarningsTable customerId={customerId} />
          </section>

          <section className="flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="py-3 text-lg font-semibold text-neutral-900">
                Activity
              </h2>
              <Link
                href={`/programs/${programSlug}/events?interval=all&customerId=${customerId}`}
              >
                <Button
                  variant="secondary"
                  text="View all"
                  className="h-7 px-2"
                />
              </Link>
            </div>
            <CustomerActivityList
              activity={customer?.activity}
              isLoading={!customer}
            />
          </section>
        </div>

        {/* Right side details */}
        <div className="-order-1 lg:order-1">
          <CustomerDetailsColumn
            customer={customer}
            customerActivity={customer?.activity}
            isCustomerActivityLoading={!customer}
          />
        </div>
      </div>
    </div>
  );
}

const EarningsTable = memo(({ customerId }: { customerId: string }) => {
  const { programSlug } = useParams();

  const { data: earningsData, isLoading: isEarningsLoading } = useSWR<
    PartnerEarningsResponse[]
  >(
    `/api/partner-profile/programs/${programSlug}/earnings?interval=all&pageSize=${CUSTOMER_PAGE_EVENTS_LIMIT}&customerId=${customerId}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { data: totalEarnings, isLoading: isTotalEarningsLoading } = useSWR<{
    count: number;
  }>(
    // Only fetch total earnings count if the earnings data is equal to the limit
    earningsData?.length === CUSTOMER_PAGE_EVENTS_LIMIT &&
      `/api/partner-profile/programs/${programSlug}/earnings/count?interval=all&customerId=${customerId}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return (
    <CustomerSalesTable
      sales={earningsData}
      totalSales={
        isTotalEarningsLoading
          ? undefined
          : totalEarnings?.count ?? earningsData?.length
      }
      viewAllHref={`/programs/${programSlug}/earnings?interval=all&customerId=${customerId}`}
      isLoading={isEarningsLoading}
    />
  );
});
