"use client";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Receipt2 } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Stripe } from "stripe";
import useSWR from "swr";

export default function WorkspaceInvoicesClient() {
  const { slug } = useParams();
  const { data: invoices } = useSWR<Stripe.Invoice[]>(
    `/api/workspaces/${slug}/billing/invoices`,
    fetcher,
  );

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col items-start justify-between gap-y-4 p-6 md:p-8 xl:flex-row">
        <div className="flex items-center gap-4">
          <Link
            href={`/${slug}/settings/billing`}
            className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h2 className="text-xl font-medium">Invoices</h2>
            <p className="text-balance text-sm leading-normal text-neutral-500">
              A history of all your Dub invoices
            </p>
          </div>
        </div>
      </div>
      <div className="grid divide-y divide-neutral-200 border-t border-neutral-200 p-4">
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

const InvoiceCard = ({ invoice }: { invoice: Stripe.Invoice }) => {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="text-sm">
        <div className="font-medium">Dub subscription</div>
        <div className="text-neutral-500">
          {new Date(invoice.created * 1000).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
            day: "numeric",
          })}
        </div>
      </div>
      <div className="text-sm">
        <div className="font-medium">Total</div>
        <div className="text-neutral-500">
          ${(invoice.amount_paid / 100).toFixed(2)}
        </div>
      </div>
      <a
        href={invoice.invoice_pdf || "#"}
        target="_blank"
        download
        className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm transition-colors hover:bg-neutral-100"
      >
        View
      </a>
    </div>
  );
};

const InvoiceCardSkeleton = () => {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex flex-col gap-1 text-sm">
        <div className="h-4 w-32 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
      </div>
      <div className="text-sm">
        <div className="h-4 w-16 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-4 w-20 animate-pulse rounded-md bg-neutral-200" />
      </div>
      <div className="h-8 w-16 animate-pulse rounded-md bg-neutral-200" />
    </div>
  );
};
