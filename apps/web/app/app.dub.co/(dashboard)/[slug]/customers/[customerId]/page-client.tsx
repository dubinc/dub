"use client";

import useCustomer from "@/lib/swr/use-customer";
import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerActivityResponse, SaleEvent } from "@/lib/types";
import DeviceIcon from "@/ui/analytics/device-icon";
import { CustomerActivityList } from "@/ui/customers/customer-activity-list";
import { CustomerEarningsTable } from "@/ui/customers/customer-earnings-table";
import { BackLink } from "@/ui/shared/back-link";
import { CopyButton, UTM_PARAMETERS } from "@dub/ui";
import {
  capitalize,
  cn,
  COUNTRIES,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  getParamsFromURL,
  getPrettyUrl,
} from "@dub/utils";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Fragment, HTMLProps, memo, useMemo } from "react";
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

  const link = customerActivity?.link;
  const click = customerActivity?.events.find((e) => e.event === "click");

  if (click)
    click.url =
      "https://dub.co/brand?utm_source=dub&utm_medium=referral&utm_campaign=brand";

  const utmParams = useMemo(() => {
    if (!click?.url) return null;
    const allParams = getParamsFromURL(click.url);

    return UTM_PARAMETERS.map((p) => ({
      ...p,
      value: allParams?.[p.key],
    })).filter(({ value }) => value);
  }, [click?.url]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  if (!customer) notFound();

  return (
    <div className="mt-2">
      <BackLink href={`/${slug}/links`}>Dashboard</BackLink>
      <div className="mt-5 flex items-center gap-4">
        <img
          src={customer.avatar || `${DICEBEAR_AVATAR_URL}${customer.name}`}
          alt={customer.name}
          className="size-12 rounded-full"
        />
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-semibold leading-tight text-neutral-900">
            {customer.name}
          </h1>

          {customer.email && (
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
          )}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 items-start gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* Main content */}
        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-neutral-900">Earnings</h2>
            <EarningsTable customerId={customerId} />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-neutral-900">Activity</h2>
            <CustomerActivityList
              activity={customerActivity}
              isLoading={isCustomerActivityLoading}
            />
          </section>
        </div>

        {/* Right side details */}
        <div className="-order-1 grid grid-cols-1 gap-6 overflow-hidden whitespace-nowrap text-sm text-neutral-900 min-[320px]:grid-cols-2 lg:order-1 lg:grid-cols-1">
          <div className="flex flex-col gap-2">
            <DetailHeading>Details</DetailHeading>
            {customer.country && (
              <span className="flex items-center gap-2">
                <img
                  src={`https://hatscripts.github.io/circle-flags/flags/${customer.country.toLowerCase()}.svg`}
                  alt=""
                  className="size-3.5"
                />
                <span className="truncate">{COUNTRIES[customer.country]}</span>
              </span>
            )}
            {click
              ? [
                  {
                    icon: (
                      <DeviceIcon
                        display={capitalize(click.os)!}
                        tab="os"
                        className="size-3.5 shrink-0"
                      />
                    ),
                    value: click.os,
                  },
                  {
                    icon: (
                      <DeviceIcon
                        display={capitalize(click.device)!}
                        tab="devices"
                        className="size-3.5 shrink-0"
                      />
                    ),
                    value: click.device,
                  },
                  {
                    icon: (
                      <DeviceIcon
                        display={capitalize(click.browser)!}
                        tab="browsers"
                        className="size-3.5 shrink-0"
                      />
                    ),
                    value: click.browser,
                  },
                ]
                  .filter(({ value }) => value)
                  .map(({ icon, value }, idx) => (
                    <span className="flex items-center gap-2">
                      {icon}
                      <span className="truncate">{value}</span>
                    </span>
                  ))
              : isCustomerActivityLoading && (
                  <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-100" />
                )}
          </div>

          <div className="flex flex-col gap-2">
            <DetailHeading>Customer since</DetailHeading>
            <span>
              {new Date(customer.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <DetailHeading>Lifetime value</DetailHeading>
            {isCustomerActivityLoading ? (
              <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-100" />
            ) : (
              <span>
                {customerActivity?.ltv !== undefined
                  ? currencyFormatter(customerActivity.ltv / 100, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "-"}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <DetailHeading>Referral link </DetailHeading>
            {isCustomerActivityLoading ? (
              <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-100" />
            ) : link ? (
              <Link
                href={`/${slug}/links/${link.domain}/${link.key}`}
                target="_blank"
                className="min-w-0 overflow-hidden truncate hover:text-neutral-950 hover:underline"
              >
                {getPrettyUrl(link.shortLink)}
              </Link>
            ) : (
              <span>-</span>
            )}
          </div>

          {utmParams && (
            <div className="flex flex-col gap-2">
              <DetailHeading>UTM</DetailHeading>
              <div className="grid w-full grid-cols-[min-content,minmax(0,1fr)] gap-x-4 gap-y-2 overflow-hidden">
                {utmParams.map(({ label, value }) => (
                  <Fragment key={label}>
                    <span className="truncate">{label}</span>
                    <span className="truncate text-neutral-500">{value}</span>
                  </Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DetailHeading = ({
  className,
  ...rest
}: HTMLProps<HTMLHeadingElement>) => (
  <h2
    className={cn("font-semibold text-neutral-900", className)}
    {...rest}
  ></h2>
);

const EarningsTable = memo(({ customerId }: { customerId: string }) => {
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
    <CustomerEarningsTable
      sales={salesData}
      totalSales={totalSales?.sales}
      viewAllHref={`/${slug}/events?event=sales&interval=all&customerId=${customerId}`}
      isLoading={isSalesLoading || isTotalSalesLoading}
    />
  );
});
