"use client";

import { InvoiceProps } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { buttonVariants, Receipt2, useRouterStuff } from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function WorkspaceInvoicesClient() {
  const { slug } = useParams();
  const { searchParams } = useRouterStuff();

  const invoiceType = searchParams.get("type") || "subscription";

  const { data: invoices } = useSWR<InvoiceProps[]>(
    `/api/workspaces/${slug}/billing/invoices?type=${invoiceType}`,
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

const InvoiceCard = ({ invoice }: { invoice: InvoiceProps }) => {
  return (
    <div className="grid grid-cols-3 gap-4 p-4">
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
        <div className="text-neutral-500">
          ${(invoice.total / 100).toFixed(2)}
        </div>
      </div>

      <div className="flex justify-end">
        <a
          href={invoice.pdfUrl || "#"}
          target="_blank"
          download
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "flex h-10 items-center rounded-md border px-4 text-sm",
            !invoice.pdfUrl && "pointer-events-none opacity-50",
          )}
          title={invoice.pdfUrl ? "View invoice" : "Not available"}
        >
          View invoice
        </a>
      </div>
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
      <div className="flex flex-col gap-1">
        <div className="h-4 w-16 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-4 w-20 animate-pulse rounded-md bg-neutral-200" />
      </div>
      <div className="h-8 w-16 animate-pulse rounded-md bg-neutral-200" />
    </div>
  );
};
