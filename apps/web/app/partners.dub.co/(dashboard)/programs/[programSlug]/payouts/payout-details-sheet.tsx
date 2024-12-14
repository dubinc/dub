import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerPayoutResponse, PartnerSaleResponse } from "@/lib/types";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { PayoutTypeBadge } from "@/ui/partners/payout-type-badge";
import { X } from "@/ui/shared/icons";
import {
  Button,
  Sheet,
  StatusBadge,
  Table,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  capitalize,
  cn,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  formatDate,
  formatDateTime,
} from "@dub/utils";
import { Dispatch, Fragment, SetStateAction, useMemo, useState } from "react";
import useSWR from "swr";

type PayoutDetailsSheetProps = {
  payout: PartnerPayoutResponse;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PayoutDetailsSheetContent({
  payout,
  setIsOpen,
}: PayoutDetailsSheetProps) {
  const { programEnrollment } = useProgramEnrollment();

  const {
    data: sales,
    isLoading,
    error,
  } = useSWR<PartnerSaleResponse[]>(
    programEnrollment
      ? `/api/partners/${programEnrollment.partnerId}/programs/${programEnrollment.programId}/sales?payoutId=${payout.id}&start=${payout.periodStart}&end=${payout.periodEnd}`
      : undefined,
    fetcher,
  );

  const invoiceData = useMemo(() => {
    const statusBadge = PayoutStatusBadges[payout.status];

    return {
      Period:
        !payout.periodStart || !payout.periodEnd
          ? "-"
          : `${formatDate(payout.periodStart, {
              month: "short",
              year:
                new Date(payout.periodStart).getFullYear() ===
                new Date(payout.periodEnd).getFullYear()
                  ? undefined
                  : "numeric",
            })}-${formatDate(payout.periodEnd, { month: "short" })}`,

      Type: <PayoutTypeBadge type={payout.type} />,

      Status: (
        <StatusBadge variant={statusBadge.variant} icon={statusBadge.icon}>
          {statusBadge.label}
        </StatusBadge>
      ),
      ...(payout.quantity && {
        [capitalize(payout.type) as string]: payout.quantity,
        [`Reward per ${payout.type.replace(/s$/, "")}`]: currencyFormatter(
          payout.amount / payout.quantity / 100,
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        ),
      }),

      Amount: (
        <strong>
          {currencyFormatter(payout.amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </strong>
      ),

      Description: payout.description || "-",
    };
  }, [payout, sales]);

  const table = useTable({
    data:
      sales?.filter(({ status }) => !["duplicate", "fraud"].includes(status)) ||
      [],
    columns: [
      {
        header: "Sale",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <img
              src={
                row.original.customer.avatar ||
                `${DICEBEAR_AVATAR_URL}${row.original.customer.name}`
              }
              alt={row.original.customer.name}
              className="size-6 rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-sm text-neutral-700">
                {row.original.customer.email || row.original.customer.name}
              </span>
              <span className="text-xs text-neutral-500">
                {formatDateTime(row.original.createdAt)}
              </span>
            </div>
          </div>
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
    resourceName: (p) => `sale${p ? "s" : ""}`,
    loading: isLoading,
    error: error ? "Failed to load sales" : undefined,
  } as any);

  return (
    <>
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
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
        <div className="p-6 pt-2">
          {payout.type === "sales" && <Table {...table} />}
        </div>
      </div>

      <div className="flex grow flex-col justify-end">
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Close"
            className="w-fit"
          />
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

export function usePayoutDetailsSheet({
  payout,
}: Omit<PayoutDetailsSheetProps, "setIsOpen">) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    payoutDetailsSheet: (
      <PayoutDetailsSheet
        payout={payout}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    ),
    setIsOpen,
  };
}
