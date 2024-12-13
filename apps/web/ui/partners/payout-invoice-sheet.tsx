import { confirmPayoutsAction } from "@/lib/actions/partners/confirm-payouts";
import usePayouts from "@/lib/swr/use-payouts";
import useWorkspace from "@/lib/swr/use-workspace";
import { X } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  Sheet,
  Table,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { cn, currencyFormatter, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Dispatch, Fragment, SetStateAction, useMemo, useState } from "react";
import { toast } from "sonner";
import { SaleRowMenu } from "./sale-row-menu";

interface PayoutInvoiceSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

// TODO:
// Handle case when there are 2 payouts for the same partner
// Fix the fee calculation
// Fix the table menus + View all

function PayoutInvoiceSheetContent({ setIsOpen }: PayoutInvoiceSheetProps) {
  const { id: workspaceId, slug } = useWorkspace();
  const { programId } = useParams<{ programId: string }>();

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
      toast.success("Payouts confirmed successfully! We'll process them soon.");
      setIsOpen(false);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const invoiceData = useMemo(() => {
    const amount =
      payouts?.reduce((acc, payout) => acc + payout.amount, 0) || 0;
    const fee = amount * 0.02;
    const total = amount + fee;

    return {
      Method: "-",

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
  }, [payouts]);

  const table = useTable({
    data: payouts || [],
    columns: [
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
      // Menu
      {
        id: "menu",
        enableHiding: false,
        minSize: 43,
        size: 43,
        maxSize: 43,
        cell: ({ row }) => <SaleRowMenu row={row} />,
      },
    ],
    columnPinning: { right: ["menu"] },
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `partner${p ? "s" : ""}`,
    loading: payoutsLoading,
    error: payoutsError
      ? "Failed to load payouts for this invoice."
      : undefined,
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
          <div className="mt-2 flex justify-end">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-7 items-center rounded-lg border px-2 text-sm",
              )}
            >
              View all
            </Link>
          </div>
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
              if (!workspaceId || !programId) {
                return;
              }

              await executeAsync({
                workspaceId,
                programId,
              });
            }}
            text="Confirm payout"
            className="w-fit"
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
