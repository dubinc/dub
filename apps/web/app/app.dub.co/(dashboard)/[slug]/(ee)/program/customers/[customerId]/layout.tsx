"use client";

import useCustomer from "@/lib/swr/use-customer";
import useCustomerActivity from "@/lib/swr/use-customer-activity";
import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerEnriched } from "@/lib/types";
import { CustomerActivityList } from "@/ui/customers/customer-activity-list";
import { CustomerDetailsColumn } from "@/ui/customers/customer-details-column";
import { CustomerStats } from "@/ui/customers/customer-stats";
import { CustomerTabs } from "@/ui/customers/customer-tabs";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { Button } from "@dub/ui";
import { ChevronRight, UserCheck } from "@dub/ui/icons";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";
import { ReactNode } from "react";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const { slug: workspaceSlug } = useWorkspace();
  const { customerId } = useParams<{ customerId: string }>();

  const { data: customer, error: customerError } =
    useCustomer<CustomerEnriched>({
      customerId,
      query: { includeExpandedFields: true },
    });

  const { customerActivity, isCustomerActivityLoading } = useCustomerActivity({
    customerId,
  });

  if (customerError && customerError.status === 404)
    redirect(`/${workspaceSlug}/program/customers`);

  return (
    <PageContent
      title={
        <div className="flex items-center gap-1.5">
          <Link
            href={`/${workspaceSlug}/program/customers`}
            aria-label="Back to customers"
            title="Back to customers"
            className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
          >
            <UserCheck className="size-4" />
          </Link>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          <div>
            {customer ? (
              customer.name
            ) : (
              <div className="h-6 w-32 animate-pulse rounded-md bg-neutral-200" />
            )}
          </div>
        </div>
      }
    >
      <PageWidthWrapper className="pb-10">
        <CustomerStats customer={customer} />

        <div className="@3xl/page:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] mt-6 grid grid-cols-1 gap-6">
          <div className="@3xl/page:order-2">
            <CustomerDetailsColumn
              customer={customer}
              customerActivity={customerActivity}
              isCustomerActivityLoading={!customer || isCustomerActivityLoading}
              workspaceSlug={workspaceSlug}
              isProgramPage
            />
          </div>
          <div className="@3xl/page:order-1">
            <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
              <CustomerTabs customer={customer} isProgramPage />
              <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white p-4">
                {children}
              </div>
            </div>

            <section className="mt-3 flex flex-col px-4">
              <div className="flex items-center justify-between">
                <h2 className="py-3 text-lg font-semibold text-neutral-900">
                  Activity
                </h2>
                <Link
                  href={`/${workspaceSlug}/events?interval=all&customerId=${customerId}`}
                >
                  <Button
                    variant="secondary"
                    text="View all"
                    className="h-7 px-2"
                  />
                </Link>
              </div>
              <CustomerActivityList
                activity={customerActivity}
                isLoading={!customer || isCustomerActivityLoading}
              />
            </section>
          </div>
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
