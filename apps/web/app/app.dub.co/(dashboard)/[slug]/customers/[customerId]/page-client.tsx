"use client";

import useCustomer from "@/lib/swr/use-customer";
import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerActivityResponse } from "@/lib/types";
import { BackLink } from "@/ui/shared/back-link";
import { CopyButton } from "@dub/ui";
import {
  cn,
  COUNTRIES,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  getPrettyUrl,
} from "@dub/utils";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { HTMLProps } from "react";
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
    includeClickEvent: true,
  });

  let { data: customerActivity, isLoading: isCustomerActivityLoading } =
    useSWR<CustomerActivityResponse>(
      customer &&
        `/api/customers/${customer.id}/activity?workspaceId=${workspaceId}`,
      fetcher,
    );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  if (!customer) notFound();

  const link = customerActivity?.link;

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
            <h2 className="text-lg font-semibold text-neutral-900">Sales</h2>
            <div className="h-64 rounded-lg bg-neutral-100" />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-neutral-900">Activity</h2>
            <div className="h-64 rounded-lg bg-neutral-100" />
          </section>
        </div>

        {/* Right side details */}
        <div className="-order-1 grid grid-cols-2 gap-6 text-sm text-neutral-900 lg:order-1 lg:grid-cols-1">
          {customer.country && (
            <div className="flex flex-col gap-2">
              <DetailHeading>Details</DetailHeading>
              <span className="flex items-center gap-2">
                <img
                  src={`https://hatscripts.github.io/circle-flags/flags/${customer.country.toLowerCase()}.svg`}
                  alt=""
                  className="size-3.5"
                />
                {COUNTRIES[customer.country]}
              </span>
            </div>
          )}

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
