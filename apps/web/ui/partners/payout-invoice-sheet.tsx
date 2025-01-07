import { confirmPayoutsAction } from "@/lib/actions/partners/confirm-payouts";
import {
  DUB_PARTNERS_PAYOUT_FEE,
  MIN_PAYOUT_AMOUNT,
} from "@/lib/partners/constants";
import usePayouts from "@/lib/swr/use-payouts";
import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutResponse } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Sheet, Table, useRouterStuff, useTable } from "@dub/ui";
import { cn, currencyFormatter, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { Dispatch, Fragment, SetStateAction, useMemo, useState } from "react";
import { toast } from "sonner";

interface PayoutInvoiceSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function PayoutInvoiceSheetContent({ setIsOpen }: PayoutInvoiceSheetProps) {
  const { id: workspaceId, slug } = useWorkspace();
  const { programId } = useParams<{ programId: string }>();
  const [selectedPayouts, setSelectedPayouts] = useState<PayoutResponse[]>([]);

  const {
    payouts,
    error: payoutsError,
    loading: payoutsLoading,
  } = usePayouts({
    query: {
      status: "pending",
    },
  });

  const { executeAsync, isExecuting } = useAction(confirmPayoutsAction, {
    onSuccess: async () => {
      toast.success(
        "Payouts confirmed successfully! They will be processed soon.",
      );
      setIsOpen(false);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  //  Filter out payouts that:
  //  - Belong to a partner that doesn’t have `payoutsEnabled`
  //  - Payout amount is less than $10
  const pendingPayouts = useMemo(
    () =>
      payouts?.filter(
        (payout) =>
          payout.partner.payoutsEnabled && payout.amount >= MIN_PAYOUT_AMOUNT,
      ),
    [payouts],
  );

  const invoiceData = useMemo(() => {
    if (!selectedPayouts) {
      return {
        Amount: (
          <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
        ),
        Fee: (
          <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
        ),
        Total: (
          <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
        ),
      };
    }

    const amount = selectedPayouts.reduce(
      (acc, payout) => acc + payout.amount,
      0,
    );
    const fee = amount * DUB_PARTNERS_PAYOUT_FEE;
    const total = amount + fee;

    return {
      Amount: currencyFormatter(amount / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),

      Fee: currencyFormatter(fee / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),

      Total: currencyFormatter(total / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  }, [selectedPayouts]);

  const table = useTable({
    data: pendingPayouts || [],
    columns: [
      {
        id: "selection",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer rounded-full border-gray-300 text-black focus:outline-none focus:ring-0"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer rounded-full border-gray-300 text-black focus:outline-none focus:ring-0"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        minSize: 10,
        size: 30,
      },
      {
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <img
              src={
                row.original.partner.image ||
                `${DICEBEAR_AVATAR_URL}${row.original.partner.name}`
              }
              alt={row.original.partner.name}
              className="size-6 rounded-full"
            />
            <span className="text-sm text-neutral-700">
              {row.original.partner.name}
            </span>
          </div>
        ),
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
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `pending payout${p ? "s" : ""}`,
    loading: payoutsLoading,
    error: payoutsError
      ? "Failed to load payouts for this invoice."
      : undefined,

    getRowId: (originalRow: PayoutResponse) => originalRow.id,
    onRowSelectionChange: (rows: Row<PayoutResponse>[]) =>
      setSelectedPayouts(rows.map((row) => row.original)),
    selectedRows: selectedPayouts?.reduce((acc, payout) => {
      acc[payout.id] = true;
      return acc;
    }, {}),
  } as any);

  return (
    <>
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Payout invoice
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
          <Table {...table} />
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
          <Button
            type="button"
            variant="primary"
            loading={isExecuting}
            onClick={async () => {
              if (!workspaceId || !programId || !selectedPayouts.length) {
                return;
              }

              await executeAsync({
                workspaceId,
                programId,
                payoutIds: selectedPayouts.map((p) => p.id),
              });
            }}
            text="Confirm payout"
            className="w-fit"
            disabled={selectedPayouts?.length === 0}
            disabledTooltip={
              selectedPayouts?.length === 0
                ? "At least one payout must be selected."
                : ""
            }
          />
        </div>
      </div>
    </>
  );
}

export function PayoutInvoiceSheet({
  isOpen,
  setIsOpen,
}: PayoutInvoiceSheetProps & {
  isOpen: boolean;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
      onClose={() => {
        queryParams({ del: "payoutId", scroll: false });
      }}
    >
      <PayoutInvoiceSheetContent setIsOpen={setIsOpen} />
    </Sheet>
  );
}

export function usePayoutInvoiceSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    payoutInvoiceSheet: (
      <PayoutInvoiceSheet isOpen={isOpen} setIsOpen={setIsOpen} />
    ),
    setIsOpen,
  };
}
