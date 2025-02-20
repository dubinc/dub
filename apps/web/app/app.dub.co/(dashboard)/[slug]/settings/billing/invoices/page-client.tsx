"use client";

import usePrograms from "@/lib/swr/use-programs";
import { InvoiceProps } from "@/lib/types";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import {
  Button,
  buttonVariants,
  InvoiceDollar,
  Receipt2,
  StatusBadge,
  TabSelect,
  useRouterStuff,
} from "@dub/ui";
import { cn, currencyFormatter, fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function WorkspaceInvoicesClient() {
  const { slug } = useParams();
  const { programs } = usePrograms();
  const { searchParams, queryParams } = useRouterStuff();

  const invoiceType = searchParams.get("type") || "subscription";

  const { data: invoices } = useSWR<InvoiceProps[]>(
    `/api/workspaces/${slug}/billing/invoices?type=${invoiceType}`,
    fetcher,
  );

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col items-start justify-between gap-y-4 p-6 md:p-8 md:pb-2 lg:flex-row">
        <div>
          <h2 className="text-xl font-medium">Invoices</h2>
          <p className="text-balance text-sm leading-normal text-neutral-500">
            A history of all your Dub invoices
          </p>
        </div>
      </div>
      {programs?.length && (
        <TabSelect
          className="px-4 md:px-5"
          options={[
            { id: "subscription", label: "Subscription" },
            { id: "payout", label: "Partner Payouts" },
          ]}
          selected={invoiceType}
          onSelect={(id) => {
            queryParams({
              set: {
                type: id,
              },
            });
          }}
        />
      )}
      <div className="grid divide-y divide-neutral-200 border-t border-neutral-200">
        {invoices ? (
          invoices.length > 0 ? (
            invoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))
          ) : (
            <AnimatedEmptyState
              title="No invoices found"
              description="You don't have any invoices yet"
              cardContent={() => (
                <>
                  <Receipt2 className="size-4 text-neutral-700" />
                  <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
                </>
              )}
              className="border-none"
            />
          )
        ) : (
          <>
            <InvoiceCardSkeleton />
            <InvoiceCardSkeleton />
            <InvoiceCardSkeleton />
          </>
        )}
      </div>
    </div>
  );
}

const InvoiceCard = ({ invoice }: { invoice: InvoiceProps }) => {
  return (
    <div className="grid grid-cols-3 gap-4 px-6 py-4 sm:px-12">
      <div className="text-sm">
        <div className="font-medium">{invoice.description}</div>
        <div className="text-neutral-500">
          {new Date(invoice.createdAt).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
            day: "numeric",
          })}
        </div>
      </div>

      <div className="text-left text-sm">
        <div className="font-medium">Total</div>
        <div className="flex items-center gap-1.5 text-neutral-500">
          <span className="text-sm">
            {currencyFormatter(invoice.total / 100, {
              maximumFractionDigits: 2,
            })}
          </span>
          {invoice.status &&
            (() => {
              const badge = PayoutStatusBadges[invoice.status];
              return (
                <StatusBadge
                  icon={null}
                  variant={badge.variant}
                  className="rounded-full py-0.5"
                >
                  {badge.label}
                </StatusBadge>
              );
            })()}
        </div>
      </div>

      <div className="flex items-center justify-end">
        {invoice.pdfUrl ? (
          <a
            href={invoice.pdfUrl}
            target="_blank"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex size-8 items-center justify-center rounded-md border text-sm sm:size-auto sm:h-9 sm:px-3",
            )}
          >
            <p className="hidden sm:block">View invoice</p>
            <InvoiceDollar className="size-4 sm:hidden" />
          </a>
        ) : (
          <Button
            className="w-fit"
            variant="secondary"
            text="View invoice"
            disabled
            disabledTooltip="Invoice not available. Contact support if you need assistance."
          />
        )}
      </div>
    </div>
  );
};

const InvoiceCardSkeleton = () => {
  return (
    <div className="flex items-center justify-between px-6 py-4 sm:px-12">
      <div className="flex flex-col gap-1 text-sm">
        <div className="h-4 w-32 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="h-4 w-16 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-4 w-20 animate-pulse rounded-md bg-neutral-200" />
      </div>
      <div className="h-8 w-16 animate-pulse rounded-md bg-neutral-200" />
    </div>
  );
};
