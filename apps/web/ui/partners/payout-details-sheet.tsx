import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutResponse, SaleResponse } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  ExpandingArrow,
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
import Link from "next/link";
import { useParams } from "next/navigation";
import { Dispatch, Fragment, SetStateAction, useMemo, useState } from "react";
import useSWR from "swr";
import { PayoutStatusBadges } from "./payout-status-badges";
import { PayoutTypeBadge } from "./payout-type-badge";
import { SaleRowMenu } from "./sale-row-menu";

type PayoutDetailsSheetProps = {
  payout: PayoutResponse;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PayoutDetailsSheetContent({
  payout,
  setIsOpen,
}: PayoutDetailsSheetProps) {
  const { id: workspaceId, slug } = useWorkspace();
  const { programId } = useParams() as { programId: string };

  const {
    data: sales,
    isLoading,
    error,
  } = useSWR<SaleResponse[]>(
    payout.type === "sales" &&
      `/api/programs/${programId}/sales?workspaceId=${workspaceId}&payoutId=${payout.id}&interval=all&pageSize=10`,
    fetcher,
  );

  const invoiceData = useMemo(() => {
    const statusBadge = PayoutStatusBadges[payout.status];

    return {
      Partner: (
        <a
          href={`/${slug}/programs/${programId}/partners?partnerId=${payout.partner.id}`}
          target="_blank"
          className="group flex items-center gap-0.5"
        >
          <img
            src={
              payout.partner.image ||
              `${DICEBEAR_AVATAR_URL}${payout.partner.name}`
            }
            alt={payout.partner.name}
            className="mr-1.5 size-5 rounded-full"
          />
          <div>{payout.partner.name}</div>
          <ExpandingArrow className="size-3" />
        </a>
      ),

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
      Amount: currencyFormatter(payout.amount / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),

      ...(payout.invoiceId && {
        Invoice: payout.invoiceId,
      }),

      Description: payout.description || "-",
    };
  }, [payout]);

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
        id: "total",
        header: "Total",
        cell: ({ row }) =>
          currencyFormatter(row.original.earnings / 100, {
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
    resourceName: (p) => `sale${p ? "s" : ""}`,
    loading: isLoading,
    error: error ? "Failed to load sales" : undefined,
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
                <div className="flex items-center font-medium text-neutral-500">
                  {key}
                </div>
                <div className="text-neutral-800">{value}</div>
              </Fragment>
            ))}
          </div>
        </div>

        {payout.type === "sales" && (
          <div className="p-6 pt-2">
            <Table {...table} />
            <div className="mt-2 flex justify-end">
              <Link
                href={`/${slug}/programs/${programId}/sales?payoutId=${payout.id}&interval=all`}
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "flex h-7 items-center rounded-lg border px-2 text-sm",
                )}
              >
                View all
              </Link>
            </div>
          </div>
        )}
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
        queryParams({ del: "payoutId", scroll: false });
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
