import { SHEET_MAX_ITEMS } from "@/lib/partners/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionResponse, PayoutResponse } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  ExpandingArrow,
  LoadingSpinner,
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
  fetcher,
  formatDateTime,
  OG_AVATAR_URL,
  pluralize,
} from "@dub/utils";
import { formatPeriod } from "@dub/utils/src/functions/datetime";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Dispatch, Fragment, SetStateAction, useMemo, useState } from "react";
import useSWR from "swr";
import { CommissionTypeIcon } from "./comission-type-icon";
import { CommissionRowMenu } from "./commission-row-menu";
import { CommissionTypeBadge } from "./commission-type-badge";
import { PayoutStatusBadges } from "./payout-status-badges";

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
    data: commissions,
    isLoading,
    error,
  } = useSWR<CommissionResponse[]>(
    `/api/programs/${programId}/commissions?workspaceId=${workspaceId}&payoutId=${payout.id}&interval=all&pageSize=${SHEET_MAX_ITEMS}`,
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
              payout.partner.image || `${OG_AVATAR_URL}${payout.partner.name}`
            }
            alt={payout.partner.name}
            className="mr-1.5 size-5 rounded-full"
          />
          <div>{payout.partner.name}</div>
          <ExpandingArrow className="size-3" />
        </a>
      ),

      Period: formatPeriod(payout),

      Status: (
        <StatusBadge variant={statusBadge.variant} icon={statusBadge.icon}>
          {statusBadge.label}
        </StatusBadge>
      ),

      Total: currencyFormatter(payout.amount / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),

      ...(payout.invoiceId && {
        Invoice: payout.invoiceId,
      }),

      Description: payout.description || "-",
    };
  }, [payout]);

  const commissionsTable = useTable({
    data:
      commissions?.filter(
        ({ status }) => !["duplicate", "fraud"].includes(status),
      ) || [],
    columns: [
      {
        header: "Details",
        minSize: 240,
        size: 240,
        maxSize: 240,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.type === "click" ? (
              <div className="flex size-6 items-center justify-center rounded-full bg-neutral-100">
                <CommissionTypeIcon type="click" className="size-4" />
              </div>
            ) : (
              <img
                src={
                  row.original.customer.avatar ||
                  `${OG_AVATAR_URL}${row.original.customer.name}`
                }
                alt={row.original.customer.name}
                className="size-6 rounded-full"
              />
            )}

            <div className="flex flex-col">
              <span className="w-44 truncate text-sm text-neutral-700">
                {row.original.type === "click"
                  ? `${row.original.quantity} ${pluralize("click", row.original.quantity)}`
                  : row.original.customer.email || row.original.customer.name}
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
        id: "total",
        header: "Total",
        minSize: 100,
        size: 120,
        maxSize: 150,
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
        cell: ({ row }) => <CommissionRowMenu row={row} />,
      },
    ],
    columnPinning: { right: ["menu"] },
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
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-neutral-200 bg-white p-6">
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
      <div className="flex-1 overflow-y-auto">
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
        ) : commissions && commissions.length > 0 ? (
          <>
            <div className="p-6 pt-2">
              <Table {...commissionsTable} />
            </div>
            <div className="sticky bottom-0 z-10 flex justify-end border-t border-neutral-200 bg-white px-6 py-4">
              <Link
                href={`/${slug}/programs/${programId}/commissions?payoutId=${payout.id}&interval=all`}
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
