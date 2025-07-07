import { PAYOUTS_SHEET_ITEMS_LIMIT } from "@/lib/partners/constants";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerEarningsResponse, PartnerPayoutResponse } from "@/lib/types";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { ConditionalLink } from "@/ui/shared/conditional-link";
import { X } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  InvoiceDollar,
  LoadingSpinner,
  Sheet,
  StatusBadge,
  Table,
  Tooltip,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  cn,
  currencyFormatter,
  fetcher,
  formatDateTime,
  OG_AVATAR_URL,
  pluralize,
} from "@dub/utils";
import { formatPeriod } from "@dub/utils/src/functions/datetime";
import Link from "next/link";
import { Dispatch, Fragment, SetStateAction, useMemo } from "react";
import useSWR from "swr";

type PayoutDetailsSheetProps = {
  payout: PartnerPayoutResponse;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PayoutDetailsSheetContent({ payout }: PayoutDetailsSheetProps) {
  const { partner } = usePartnerProfile();

  const {
    data: earnings,
    isLoading,
    error,
  } = useSWR<PartnerEarningsResponse[]>(
    partner
      ? `/api/partner-profile/programs/${payout.program.id}/earnings?payoutId=${payout.id}&interval=all&pageSize=${PAYOUTS_SHEET_ITEMS_LIMIT}`
      : undefined,
    fetcher,
  );

  const invoiceData = useMemo(() => {
    const statusBadge = PayoutStatusBadges[payout.status];

    return {
      Program: (
        <ConditionalLink
          href={`/programs/${payout.program.slug}`}
          target="_blank"
        >
          <img
            src={
              payout.program.logo || `${OG_AVATAR_URL}${payout.program.name}`
            }
            alt={payout.program.name}
            className="mr-1.5 inline-flex size-4 rounded-sm"
          />
          {payout.program.name}
        </ConditionalLink>
      ),

      Period: formatPeriod(payout),

      Status: (
        <StatusBadge variant={statusBadge.variant} icon={statusBadge.icon}>
          {statusBadge.label}
        </StatusBadge>
      ),

      Amount: (
        <div className="flex items-center gap-2">
          <strong>
            {currencyFormatter(payout.amount / 100, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>

          {["completed", "processing"].includes(payout.status) && (
            <Tooltip content="View invoice">
              <div className="flex h-5 w-5 items-center justify-center rounded-md transition-colors duration-150 hover:border hover:border-neutral-200 hover:bg-neutral-100">
                <Link
                  href={`/invoices/${payout.id}`}
                  className="text-neutral-700"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <InvoiceDollar className="size-4" />
                </Link>
              </div>
            </Tooltip>
          )}
        </div>
      ),

      Description: payout.description || "-",
    };
  }, [payout, earnings]);

  const table = useTable({
    data:
      earnings?.filter(({ status }) =>
        ["pending", "processed", "paid"].includes(status),
      ) || [],
    columns: [
      {
        header: "Details",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {["click", "custom"].includes(row.original.type) ? (
              <div className="flex size-6 items-center justify-center rounded-full bg-neutral-100">
                <CommissionTypeIcon
                  type={row.original.type}
                  className="size-4"
                />
              </div>
            ) : (
              <img
                src={
                  row.original.customer.avatar ||
                  `${OG_AVATAR_URL}${row.original.customer.id}`
                }
                alt={row.original.customer.id}
                className="size-6 rounded-full"
              />
            )}

            <div className="flex flex-col">
              <span className="text-sm text-neutral-700">
                {row.original.type === "click"
                  ? `${row.original.quantity} ${pluralize("click", row.original.quantity)}`
                  : row.original.customer
                    ? row.original.customer.email || row.original.customer.name
                    : "Custom commission"}
              </span>
              <span className="text-xs text-neutral-500">
                {formatDateTime(row.original.createdAt)}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "type",
        header: "Type",
        minSize: 100,
        size: 120,
        maxSize: 150,
        cell: ({ row }) => (
          <CommissionTypeBadge type={row.original.type ?? "sale"} />
        ),
      },
      {
        id: "earnings",
        header: "Earnings",
        cell: ({ row }) =>
          currencyFormatter(row.original.earnings / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    columnPinning: { right: ["earnings"] },
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `commission${p ? "s" : ""}`,
    loading: isLoading,
    error: error ? "Failed to load commissions" : undefined,
  } as any);

  return (
    <div>
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Payout details
        </Sheet.Title>
        <Sheet.Close asChild>
          <Button
            variant="outline"
            icon={<X className="size-5" />}
            className="h-auto w-fit p-1"
          />
        </Sheet.Close>
      </div>
      <div className="flex flex-col gap-4 p-6">
        <div className="text-base font-medium text-neutral-900">
          Invoice details
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {Object.entries(invoiceData).map(([key, value]) => (
            <Fragment key={key}>
              <div className="flex items-center font-medium text-neutral-500">
                {key}
              </div>
              <div className="text-neutral-800">{value}</div>
            </Fragment>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : earnings?.length ? (
        <>
          <div className="p-6 pt-2">
            <Table {...table} />
          </div>
          <div className="sticky bottom-0 z-10 flex justify-end border-t border-neutral-200 bg-white px-6 py-4">
            <Link
              href={`/programs/${payout.program.slug}/earnings?payoutId=${payout.id}&start=${payout.periodStart}&end=${payout.periodEnd}`}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-7 items-center rounded-lg border px-2 text-sm",
              )}
            >
              View all
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function PayoutDetailsSheet({
  isOpen,
  ...rest
}: PayoutDetailsSheetProps & {
  isOpen: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => {
        queryParams({ del: "payoutId" });
      }}
    >
      <PayoutDetailsSheetContent {...rest} />
    </Sheet>
  );
}
