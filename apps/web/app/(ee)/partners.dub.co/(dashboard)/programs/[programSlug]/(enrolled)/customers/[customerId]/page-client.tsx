"use client";

import { CUSTOMER_PAGE_EVENTS_LIMIT } from "@/lib/constants/misc";
import usePartnerCustomer from "@/lib/swr/use-partner-customer";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerEarningsResponse } from "@/lib/types";
import { CustomerActivityList } from "@/ui/customers/customer-activity-list";
import { CustomerDetailsColumn } from "@/ui/customers/customer-details-column";
import { CustomerSalesTable } from "@/ui/customers/customer-sales-table";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import { BackLink } from "@/ui/shared/back-link";
import { Button, MoneyBill2, Tooltip } from "@dub/ui";
import { fetcher, formatDate, OG_AVATAR_URL } from "@dub/utils";
import { addMonths, isBefore } from "date-fns";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";
import { memo, useMemo } from "react";
import useSWR from "swr";

export function ProgramCustomerPageClient() {
  const { programEnrollment, showDetailedAnalytics } = useProgramEnrollment();
  const { programSlug, customerId } = useParams<{
    programSlug: string;
    customerId: string;
  }>();

  const { data: customer, isLoading } = usePartnerCustomer({
    customerId,
  });

  const rewardPeriodEndDate = useMemo(() => {
    if (!programEnrollment?.rewards || !customer?.activity?.firstSaleDate)
      return null;
    const saleReward = programEnrollment?.rewards.find(
      (r) => r.event === "sale",
    );
    if (!saleReward) return null;

    // infinite duration
    if (saleReward.maxDuration === null || saleReward.maxDuration === undefined)
      return null;

    // add the max duration to the first sale date
    return addMonths(customer.activity.firstSaleDate, saleReward.maxDuration);
  }, [programEnrollment, customer]);

  if ((!customer && !isLoading) || !showDetailedAnalytics) {
    redirect(`/programs/${programSlug}`);
  }

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
            <>
              {customer["name"] && (
                <h1 className="text-base font-semibold leading-tight text-neutral-900">
                  {customer["name"]}
                </h1>
              )}
              {customer.email && (
                <span className="text-sm font-medium text-neutral-500">
                  {customer.email}
                </span>
              )}
            </>
          ) : (
            <div className="h-5 w-24 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 items-start gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* Main content */}
        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">
                Earnings
              </h2>
              {programEnrollment?.rewards && (
                <Tooltip
                  content={
                    <ProgramRewardList
                      rewards={programEnrollment?.rewards}
                      className="gap-2 border-none p-3"
                      showModifiersTooltip={false}
                    />
                  }
                >
                  <div className="border-border-subtle flex cursor-default items-center justify-center gap-1.5 rounded-md border px-2 py-1 transition-all hover:bg-neutral-50">
                    <MoneyBill2 className="size-4" />
                    <span className="text-sm">Eligible rewards</span>
                  </div>
                </Tooltip>
              )}
            </div>
            {rewardPeriodEndDate &&
              isBefore(rewardPeriodEndDate, new Date()) && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                  <AlertCircle className="size-4 shrink-0 text-amber-600" />
                  <p className="text-sm text-amber-900">
                    The earning period for this customer has ended as of{" "}
                    {formatDate(rewardPeriodEndDate)}. No future conversions
                    will be rewarded.
                  </p>
                </div>
              )}
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
