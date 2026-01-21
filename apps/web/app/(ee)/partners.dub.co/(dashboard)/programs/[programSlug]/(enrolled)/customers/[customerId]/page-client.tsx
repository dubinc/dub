"use client";

import { CUSTOMER_PAGE_EVENTS_LIMIT } from "@/lib/constants/misc";
import usePartnerCustomer from "@/lib/swr/use-partner-customer";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerEarningsResponse } from "@/lib/types";
import { CustomerActivityList } from "@/ui/customers/customer-activity-list";
import { CustomerDetailsColumn } from "@/ui/customers/customer-details-column";
import { CustomerSalesTable } from "@/ui/customers/customer-sales-table";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import { ChevronRight, MoneyBill2, Tooltip, UserCheck } from "@dub/ui";
import { cn, fetcher, formatDate } from "@dub/utils";
import { addMonths, isBefore } from "date-fns";
import { AlertCircle } from "lucide-react";
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
    <PageContent
      title={
        <div className="flex items-center gap-1.5">
          <div
            // href={`/programs/${programSlug}/customers`}
            // aria-label="Back to customers"
            // title="Back to customers"
            className={cn(
              "bg-bg-subtle flex size-8 shrink-0 items-center justify-center rounded-lg",
              // "hover:bg-bg-emphasis transition-[transform,background-color] duration-150 active:scale-95",
            )}
          >
            <UserCheck className="size-4" />
          </div>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          <div>
            {customer ? (
              customer.name || customer.email
            ) : (
              <div className="h-6 w-32 animate-pulse rounded-md bg-neutral-200" />
            )}
          </div>
        </div>
      }
    >
      <PageWidthWrapper className="flex flex-col gap-6 pb-10">
        <div className="@3xl/page:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] grid grid-cols-1 gap-6">
          <div className="@3xl/page:order-2">
            <CustomerDetailsColumn
              customer={
                customer && customer.id
                  ? {
                      ...customer,
                      name: customer.name || "",
                      externalId: "",
                    }
                  : undefined
              }
              customerActivity={customer?.activity}
              isCustomerActivityLoading={!customer}
            />
          </div>
          <div className="@3xl/page:order-1">
            <div className="border-border-subtle overflow-hidden rounded-xl border p-4">
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

                <div className="border-border-subtle overflow-hidden rounded-lg border">
                  <EarningsTable customerId={customerId} />
                </div>
              </section>
            </div>

            <section className="mt-3 flex flex-col px-4">
              <div className="flex items-center justify-between">
                <h2 className="py-3 text-lg font-semibold text-neutral-900">
                  Activity
                </h2>
              </div>
              <CustomerActivityList
                activity={customer?.activity}
                isLoading={!customer}
              />
            </section>
          </div>
        </div>
      </PageWidthWrapper>
    </PageContent>
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
