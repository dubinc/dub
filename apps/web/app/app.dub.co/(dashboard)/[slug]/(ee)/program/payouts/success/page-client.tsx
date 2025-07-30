"use client";

import useProgram from "@/lib/swr/use-program";
import LayoutLoader from "@/ui/layout/layout-loader";
import { currencyFormatter, DUB_LOGO, fetcher, pluralize } from "@dub/utils";
import { Invoice } from "@prisma/client";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";

export function PayoutsSuccessPageClient() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");

  const {
    data: invoice,
    isLoading,
    mutate,
  } = useSWR<Invoice & { _count: { payouts: number } }>(
    invoiceId && `/api/workspaces/${slug}/billing/invoices/${invoiceId}`,
    fetcher,
  );

  const { program } = useProgram();

  if (isLoading || !program) {
    return <LayoutLoader />;
  }

  if (!invoice) {
    return "Invoice not found";
  }

  // Convert total from cents to dollars
  const amountPaid = currencyFormatter(invoice.amount / 100);

  // this can be zero in the beginning, so maybe we can add a loading state for the partner count,
  // while we keep calling mutate() for the invoice SWR above?
  // e.g. something like a NumberFlow animation could work – for consistency we should do the same for amountPaid as well
  const partnerCount = invoice._count.payouts;

  return (
    <div className="flex flex-col items-center justify-center">
      <img
        src={program.logo ?? DUB_LOGO}
        alt={program.name}
        className="size-8 rounded-full"
      />
      <h2 className="text-2xl font-bold">{program.name}</h2>
      <p>{invoice.number}</p>
      <p>
        You've paid out {amountPaid} to {partnerCount}{" "}
        {pluralize("partner", partnerCount)}.
      </p>
    </div>
  );
}
