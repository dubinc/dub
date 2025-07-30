"use client";

import useProgram from "@/lib/swr/use-program";
import LayoutLoader from "@/ui/layout/layout-loader";
import { currencyFormatter, DUB_LOGO, fetcher } from "@dub/utils";
import { Invoice } from "@prisma/client";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";

export function PayoutsSuccessPageClient() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");

  const { data: invoice, isLoading } = useSWR<Invoice>(
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
  const amountInDollars = currencyFormatter(invoice.total / 100);

  return (
    <div className="flex flex-col items-center justify-center">
      <img
        src={program.logo ?? DUB_LOGO}
        alt={program.name}
        className="size-8 rounded-full"
      />
      <h2 className="text-2xl font-bold">{program.name}</h2>
      <p>{invoice.number}</p>
      <p>You've paid out {amountInDollars} to your partners.</p>
    </div>
  );
}
