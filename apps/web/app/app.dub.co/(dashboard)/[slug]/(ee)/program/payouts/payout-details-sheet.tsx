import {
  INVOICE_AVAILABLE_PAYOUT_STATUSES,
  PAYOUTS_SHEET_ITEMS_LIMIT,
} from "@/lib/constants/payouts";
import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionResponse, PayoutResponse } from "@/lib/types";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { CommissionRowMenu } from "@/ui/partners/commission-row-menu";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { ConditionalLink } from "@/ui/shared/conditional-link";
import { X } from "@/ui/shared/icons";
import { PayoutStatus } from "@dub/prisma/client";
import {
  Button,
  buttonVariants,
  CircleArrowRight,
  InvoiceDollar,
  LoadingSpinner,
  Sheet,
  StatusBadge,
  Table,
  TimestampTooltip,
  Tooltip,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  APP_DOMAIN,
  capitalize,
  cn,
  currencyFormatter,
  fetcher,
  formatDateTime,
  formatDateTimeSmart,
  OG_AVATAR_URL,
  pluralize,
} from "@dub/utils";
import { formatPeriod } from "@dub/utils/src/functions/datetime";
import Link from "next/link";
import { Dispatch, Fragment, SetStateAction, useMemo, useState } from "react";
import useSWR from "swr";

type PayoutDetailsSheetProps = {
  payout: PayoutResponse;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PayoutDetailsSheetContent({ payout }: PayoutDetailsSheetProps) {
  const { id: workspaceId, slug } = useWorkspace();
  const { queryParams } = useRouterStuff();

  const {
    data: commissions,
    isLoading,
    error,
  } = useSWR<CommissionResponse[]>(
    `/api/commissions?${new URLSearchParams({
      workspaceId: workspaceId!,
      payoutId: payout.id,
      interval: "all",
      pageSize: PAYOUTS_SHEET_ITEMS_LIMIT.toString(),
    })}`,
    fetcher,
  );

  const invoiceData = useMemo(() => {
    const statusBadge = PayoutStatusBadges[payout.status];

    return {
      Partner: (
        <ConditionalLink
          href={`/${slug}/program/partners/${payout.partner.id}`}
          target="_blank"
        >
          <img
            src={
              payout.partner.image || `${OG_AVATAR_URL}${payout.partner.name}`
            }
            alt={payout.partner.name}
            className="mr-1.5 inline-flex size-5 rounded-full"
          />
          {payout.partner.name}
        </ConditionalLink>
      ),

      Period: formatPeriod(payout),

      Status: (
        <StatusBadge variant={statusBadge.variant} icon={statusBadge.icon}>
          {statusBadge.label}
        </StatusBadge>
      ),

      Initiated: payout.initiatedAt ? (
        <TimestampTooltip
          timestamp={payout.initiatedAt}
          side="right"
          rows={["local", "utc"]}
        >
          <span className="hover:text-content-emphasis underline decoration-dotted underline-offset-2">
            {formatDateTimeSmart(payout.initiatedAt)}
          </span>
        </TimestampTooltip>
      ) : (
        "-"
      ),

      Paid: payout.paidAt ? (
        <TimestampTooltip
          timestamp={payout.paidAt}
          side="right"
          rows={["local", "utc"]}
        >
          <span className="hover:text-content-emphasis underline decoration-dotted underline-offset-2">
            {formatDateTimeSmart(payout.paidAt)}
          </span>
        </TimestampTooltip>
      ) : (
        "-"
      ),

      Amount: (
        <div className="flex items-center gap-2">
          <strong>{currencyFormatter(payout.amount)}</strong>

          {payout.mode === "external" && (
            <Tooltip
              content={
                payout.status === PayoutStatus.pending
                  ? `This payout will be made externally through the partner's account after approval.`
                  : `This payout was made externally through the partner's account.`
              }
            >
              <CircleArrowRight className="size-3.5 shrink-0 text-neutral-500" />
            </Tooltip>
          )}

          {payout.mode === "internal" &&
            INVOICE_AVAILABLE_PAYOUT_STATUSES.includes(payout.status) && (
              <Tooltip content="View invoice">
                <div className="flex h-5 w-5 items-center justify-center rounded-md transition-colors duration-150 hover:border hover:border-neutral-200 hover:bg-neutral-100">
                  <Link
                    href={`${APP_DOMAIN}/invoices/${payout.invoiceId || payout.id}`}
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

      ...(payout.invoiceId && {
        Invoice: (
          <ConditionalLink
            href={`${APP_DOMAIN}/invoices/${payout.invoiceId}`}
            target="_blank"
          >
            {payout.invoiceId}
          </ConditionalLink>
        ),
      }),

      Description: payout.description || "-",
    };
  }, [payout, slug]);

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
              <span className="w-44 truncate text-sm text-neutral-700">
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
        id: "total",
        header: "Total",
        minSize: 100,
        size: 120,
        maxSize: 150,
        cell: ({ row }) => currencyFormatter(row.original.earnings),
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

  const ViewAllPayoutsLink = () => (
    <Link
      href={`/${slug}/program/commissions?payoutId=${payout.id}&interval=all`}
      target="_blank"
      className={cn(
        buttonVariants({ variant: "secondary" }),
        "flex h-7 items-center rounded-lg border px-2 text-sm",
      )}
    >
      View all
    </Link>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
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
      </div>
      <div className="flex grow flex-col">
        <div className="flex flex-col gap-4 p-6">
          <div className="text-base font-medium text-neutral-900">
            Invoice details
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {Object.entries(invoiceData).map(([key, value]) => (
              <Fragment key={key}>
                <div className="flex items-center font-medium text-neutral-500">
                  {key}
                </div>
                <div className="col-span-2 text-neutral-800">{value}</div>
              </Fragment>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : commissions && commissions.length > 0 ? (
          <div className="p-6 pt-2">
            <Table {...commissionsTable} />

            {payout.status === "pending" && (
              <div className="flex justify-end py-4">
                <ViewAllPayoutsLink />
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-between gap-2 p-5">
          {payout.status === "pending" ? (
            <Button
              type="button"
              text="Confirm payout"
              disabledTooltip={
                !payout.partner.payoutsEnabledAt
                  ? "This partner has not [connected a bank account](https://dub.co/help/article/receiving-payouts) to receive payouts yet, which means they won't be able to receive payouts from your program."
                  : undefined
              }
              onClick={() => {
                queryParams({
                  set: {
                    confirmPayouts: "true",
                    selectedPayoutId: payout.id,
                  },
                  del: "payoutId",
                  scroll: false,
                });
              }}
            />
          ) : (
            <ViewAllPayoutsLink />
          )}
        </div>
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
