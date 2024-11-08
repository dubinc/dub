import { PayoutWithPartnerProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import {
  Button,
  Sheet,
  StatusBadge,
  Table,
  useTable,
  useTablePagination,
} from "@dub/ui";
import {
  capitalize,
  cn,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  formatDate,
} from "@dub/utils";
import { subDays } from "date-fns";
import { Dispatch, Fragment, SetStateAction, useMemo, useState } from "react";
import { PayoutStatusBadges } from "./payout-status-badges";

type PayoutDetailsSheetProps = {
  payout: PayoutWithPartnerProps;
  onConfirmPayout?: () => void;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PayoutDetailsSheetContent({
  payout,
  onConfirmPayout,
  setIsOpen,
}: PayoutDetailsSheetProps) {
  // TODO: [payouts] Fetch real data
  const totalConversions = 2;
  const conversions = [
    {
      id: "1",
      date: subDays(payout.periodEnd, 1).toISOString(),
      customer: {
        email: "steven@address.com",
      },
      amount: 1000,
    },
    {
      id: "2",
      date: subDays(payout.periodEnd, 2).toISOString(),
      customer: {
        email: "marcus@address.com",
      },
      amount: 1600,
    },
  ];
  const error = null;
  const loading = !conversions && !error;

  const invoiceData = useMemo(() => {
    const statusBadge = PayoutStatusBadges[payout.status];
    return {
      Partner: (
        <div className="flex items-center gap-2">
          <img
            src={
              payout.partner.logo ||
              `${DICEBEAR_AVATAR_URL}${payout.partner.name}`
            }
            alt={payout.partner.name}
            className="size-5 rounded-full"
          />
          <div>{payout.partner.name}</div>
        </div>
      ),
      Period: `${formatDate(payout.periodStart, {
        month: "short",
        year:
          new Date(payout.periodStart).getFullYear() ===
          new Date(payout.periodEnd).getFullYear()
            ? undefined
            : "numeric",
      })}-${formatDate(payout.periodEnd, { month: "short" })}`,
      Sales: totalConversions,
      Total: currencyFormatter(payout.total / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      Status: (
        <StatusBadge variant={statusBadge.variant} icon={statusBadge.icon}>
          {statusBadge.label}
        </StatusBadge>
      ),
    };
  }, [payout, totalConversions]);

  const { pagination, setPagination } = useTablePagination({
    pageSize: 100,
    page: 1,
  });

  const showPagination = totalConversions > 100;

  const table = useTable({
    data: conversions || [],
    columns: [
      {
        header: "Conversion",
        cell: ({ row }) => row.original.customer.email,
      },
      {
        id: "total",
        header: "Total",
        cell: ({ row }) =>
          currencyFormatter(row.original.amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    ...(showPagination && {
      pagination,
      onPaginationChange: setPagination,
      rowCount: totalConversions,
    }),
    columnPinning: { right: ["menu"] },
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: cn(
      !showPagination && "[&_tr:last-child>td]:border-b-transparent", // Hide bottom row border
    ),
    scrollWrapperClassName: "min-h-0",
    resourceName: (p) => `conversion${p ? "s" : ""}`,
    loading,
    error: error ? "Failed to load conversions" : undefined,
  } as any);

  return (
    <>
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            {capitalize(payout.status)} payout
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
                <div className="font-medium text-neutral-500">{key}</div>
                <div className="text-neutral-800">{value}</div>
              </Fragment>
            ))}
          </div>
        </div>
        <div className="p-6 pt-2">
          <Table {...table} />
        </div>
      </div>
      <div className="flex grow flex-col justify-end">
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text={onConfirmPayout ? "Cancel" : "Close"}
            className="w-fit"
          />
          {onConfirmPayout && (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                onConfirmPayout();
                setIsOpen(false);
              }}
              text="Review payout"
              className="w-fit"
            />
          )}
        </div>
      </div>
    </>
  );
}

export function PayoutDetailsSheet({
  isOpen,
  ...rest
}: PayoutDetailsSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <PayoutDetailsSheetContent {...rest} />
    </Sheet>
  );
}

export function usePayoutDetailsSheet({
  payout,
  onConfirmPayout,
}: Omit<PayoutDetailsSheetProps, "setIsOpen">) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    payoutDetailsSheet: (
      <PayoutDetailsSheet
        payout={payout}
        onConfirmPayout={onConfirmPayout}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    ),
    setIsOpen,
  };
}
