"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import {
  CustomerActivityResponse,
  CustomerEnriched,
  PartnerEarningsResponse,
} from "@/lib/types";
import { CustomerActivityList } from "@/ui/customers/customer-activity-list";
import { CustomerDetailsColumn } from "@/ui/customers/customer-details-column";
import { CustomerSalesTable } from "@/ui/customers/customer-sales-table";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import { BackLink } from "@/ui/shared/back-link";
import { MoneyBill2, Tooltip, User } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { notFound, useParams } from "next/navigation";
import { memo } from "react";
import useSWR from "swr";

export function ProgramCustomerPageClient() {
  const { programEnrollment } = useProgramEnrollment();
  const { programSlug, customerId } = useParams<{
    programSlug: string;
    customerId: string;
  }>();

  const {
    data: customer,
    isLoading,
    error,
  } = useSWR<CustomerEnriched>(
    `/api/partner-profile/programs/${programSlug}/customers/${customerId}`,
    fetcher,
  );

  const { data: customerActivity, isLoading: isCustomerActivityLoading } =
    useSWR<CustomerActivityResponse>(
      customer &&
        `/api/partner-profile/programs/${programSlug}/customers/${customer.id}/activity`,
      fetcher,
    );

  if (!customer && !isLoading && !error) notFound();

  return (
    <div className="mb-10 mt-2">
      <BackLink href={`/${programSlug}/earnings`}>Earnings</BackLink>
      <div className="mt-5 flex items-center gap-4">
        <div className="border-border-subtle flex size-12 items-center justify-center rounded-full border bg-gradient-to-t from-neutral-50">
          <User className="size-4 text-neutral-700" />
        </div>

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

const EarningsTable = memo(({ customerId }: { customerId: string }) => {
  const { programSlug } = useParams();

  const { data: earningsData, isLoading: isEarningsLoading } = useSWR<
    PartnerEarningsResponse[]
  >(
    `/api/partner-profile/programs/${programSlug}/earnings?interval=all&pageSize=8&customerId=${customerId}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { data: totalEarnings, isLoading: isTotalEarningsLoading } = useSWR<{
    count: number;
  }>(
    `/api/partner-profile/programs/${programSlug}/earnings/count?interval=all&customerId=${customerId}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return (
    <CustomerSalesTable
      sales={earningsData}
      totalSales={totalEarnings?.count}
      viewAllHref={`/programs/${programSlug}/earnings?interval=all&customerId=${customerId}`}
      isLoading={isEarningsLoading || isTotalEarningsLoading}
    />
  );
});
