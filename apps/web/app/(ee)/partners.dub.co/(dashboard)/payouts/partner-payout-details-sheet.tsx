import {
  INVOICE_AVAILABLE_PAYOUT_STATUSES,
  PAYOUTS_SHEET_ITEMS_LIMIT,
} from "@/lib/constants/payouts";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerEarningsResponse, PartnerPayoutResponse } from "@/lib/types";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { ConditionalLink } from "@/ui/shared/conditional-link";
import { X } from "@/ui/shared/icons";
import { PayoutStatus } from "@dub/prisma/client";
import {
  Button,
  CircleArrowRight,
  CopyText,
  DynamicTooltipWrapper,
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
  cn,
  currencyFormatter,
  fetcher,
  formatDateTime,
  formatDateTimeSmart,
  OG_AVATAR_URL,
  pluralize,
} from "@dub/utils";
import { formatPeriod } from "@dub/utils/src/functions/datetime";
import { addBusinessDays } from "date-fns";
import Link from "next/link";
import { Dispatch, Fragment, SetStateAction, useMemo } from "react";
import useSWR from "swr";

type PayoutDetailsSheetProps = {
  payout: PartnerPayoutResponse;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PayoutDetailsSheetContent({ payout }: PayoutDetailsSheetProps) {
  const { partner, payoutMethod } = usePartnerProfile();

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

    return [
      {
        key: "Program",
        value: (
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
      },
      {
        key: "Period",
        value: formatPeriod(payout),
      },
      {
        key: "Amount",
        value: (
          <div className="flex items-center gap-2">
            <strong>{currencyFormatter(payout.amount)}</strong>

            {payout.mode === "external" && (
              <Tooltip
                content={
                  payout.status === PayoutStatus.pending
                    ? `This payout will be made externally through your ${payout.program.name} account after approval.`
                    : `This payout was made externally through your ${payout.program.name} account.`
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
      },

      {
        key: "Description",
        value: payout.description || "-",
      },

      {
        key: "Status",
        value: (
          <StatusBadge variant={statusBadge.variant} icon={statusBadge.icon}>
            {statusBadge.label}
          </StatusBadge>
        ),
      },

      ...(payout.failureReason
        ? [
            {
              key: "Failure reason",
              value: (
                <span className="text-red-600">{payout.failureReason}</span>
              ),
              tooltip: `Payout failures are usually due to ${payoutMethod === "paypal" ? "incorrect PayPal account configuration" : "invalid bank account details"}. Once you've updated your account, ${
                payoutMethod === "paypal"
                  ? "you can retry the payout"
                  : "the payout will be retried automatically"
              }.`,
            },
          ]
        : []),

      {
        key: "Initiated",
        value: payout.initiatedAt ? (
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
        tooltip:
          "Date and time when the payout was initiated by the program. Payouts usually take up to 5 business days to be fully processed.",
      },
      {
        key: "Paid",
        value: payout.paidAt ? (
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
        tooltip:
          "Date and time when the payout was fully processed by the program and paid to your account.",
      },

      ...(payout.traceId
        ? [
            {
              key: "Trace ID",
              value: (
                <CopyText
                  value={payout.traceId}
                  className="text-left font-mono text-sm text-neutral-500"
                >
                  {payout.traceId}
                </CopyText>
              ),
              tooltip: `Banks can take up to 5 business days to process payouts. If you haven't received your payout${payout.paidAt ? ` by \`${formatDateTimeSmart(addBusinessDays(payout.paidAt, 5))}\`` : ""}, you can contact your bank and provide the following trace ID as reference.`,
            },
          ]
        : []),
    ];
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
        id: "earnings",
        header: "Earnings",
        cell: ({ row }) => currencyFormatter(row.original.earnings),
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
    ],
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
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
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
      </div>

      <div className="flex grow flex-col">
        <div className="flex flex-col gap-4 p-6">
          <div className="text-base font-medium text-neutral-900">
            Invoice details
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {invoiceData.map(({ key, value, tooltip }) => (
              <Fragment key={key}>
                <DynamicTooltipWrapper
                  tooltipProps={tooltip ? { content: tooltip } : undefined}
                >
                  <div
                    className={cn(
                      "flex items-center font-medium text-neutral-500",
                      tooltip &&
                        "cursor-help underline decoration-dotted underline-offset-2",
                    )}
                  >
                    {key}
                  </div>
                </DynamicTooltipWrapper>
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
          <div className="p-6 pt-2">
            <Table {...table} />
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-between gap-2 p-5">
          <Link
            href={`/programs/${payout.program.slug}/earnings?payoutId=${payout.id}&start=${payout.periodStart}&end=${payout.periodEnd}`}
            target="_blank"
            className="w-full"
          >
            <Button variant="secondary" text="View all" />
          </Link>
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
        queryParams({ del: "payoutId" });
      }}
    >
      <PayoutDetailsSheetContent {...rest} />
    </Sheet>
  );
}
