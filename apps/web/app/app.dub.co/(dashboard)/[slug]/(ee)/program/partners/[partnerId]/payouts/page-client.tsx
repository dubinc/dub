"use client";

import usePartner from "@/lib/swr/use-partner";
import usePayouts from "@/lib/swr/use-payouts";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import {
  LoadingSpinner,
  StatusBadge,
  Table,
  buttonVariants,
  useTable,
} from "@dub/ui";
import { cn, currencyFormatter, formatPeriod } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export function ProgramPartnerPayoutsPageClient() {
  const { partnerId } = useParams() as { partnerId: string };
  const { partner, error } = usePartner({ partnerId });

  return partner ? (
    <PartnerPayouts partner={partner} />
  ) : (
    <div className="flex justify-center py-16">
      {error ? (
        <span className="text-content-subtle text-sm">
          Failed to load partner payouts
        </span>
      ) : (
        <LoadingSpinner />
      )}
    </div>
  );
}

function PartnerPayouts({ partner }: { partner: EnrolledPartnerProps }) {
  const { slug } = useWorkspace();

  const {
    payouts,
    error: payoutsError,
    loading,
  } = usePayouts({
    query: { partnerId: partner.id, pageSize: 10 },
  });

  const table = useTable({
    data: payouts || [],
    loading: loading,
    error: payoutsError ? "Failed to load payouts" : undefined,
    columns: [
      {
        header: "Period",
        accessorFn: (d) => formatPeriod(d),
      },
      {
        header: "Status",
        cell: ({ row }) => {
          const badge = PayoutStatusBadges[row.original.status];
          return badge ? (
            <StatusBadge icon={badge.icon} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          ) : (
            "-"
          );
        },
      },
      {
        id: "amount",
        header: "Amount",
        accessorFn: (d) => currencyFormatter(d.amount / 100),
      },
    ],
    onRowClick: (row) => {
      window.open(
        `/${slug}/program/payouts?payoutId=${row.original.id}`,
        "_blank",
      );
    },
    resourceName: (p) => `payout${p ? "s" : ""}`,
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    emptyState: "No payouts yet",
  } as any);

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-content-emphasis text-lg font-semibold">Payouts</h2>
        {Boolean(payouts?.length) && (
          <Link
            href={`/${slug}/program/payouts?partnerId=${partner.id}`}
            target="_blank"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex h-7 items-center rounded-lg border px-2 text-sm",
            )}
          >
            View all
          </Link>
        )}
      </div>
      <div className="mt-4">
        <Table {...table} />
      </div>
    </>
  );
}
