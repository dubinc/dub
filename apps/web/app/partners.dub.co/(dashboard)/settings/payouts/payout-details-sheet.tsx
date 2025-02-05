import { SHEET_MAX_ITEMS } from "@/lib/partners/constants";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerEarningsResponse, PartnerPayoutResponse } from "@/lib/types";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { PayoutTypeBadge } from "@/ui/partners/payout-type-badge";
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
} from "@dub/utils";
import {
  formatDateTime,
  formatPeriod,
} from "@dub/utils/src/functions/datetime";
import Link from "next/link";
import { Dispatch, Fragment, SetStateAction, useMemo } from "react";
import useSWR from "swr";

type PayoutDetailsSheetProps = {
  payout: PartnerPayoutResponse;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PayoutDetailsSheetContent({
  payout,
  setIsOpen,
}: PayoutDetailsSheetProps) {
  const { partner } = usePartnerProfile();

  const {
    data: sales,
    isLoading,
    error,
  } = useSWR<PartnerEarningsResponse[]>(
    partner
      ? `/api/partner-profile/programs/${payout.program.id}/earnings?payoutId=${payout.id}&interval=all&pageSize=${SHEET_MAX_ITEMS}`
      : undefined,
    fetcher,
  );

  const invoiceData = useMemo(() => {
    const statusBadge = PayoutStatusBadges[payout.status];

    return {
      Program: (
        <a
          href={`/programs/${payout.program.slug}`}
          target="_blank"
          className="group flex items-center gap-0.5"
        >
          <img
            src={
              payout.program.logo ||
              `${DICEBEAR_AVATAR_URL}${payout.program.name}`
            }
            alt={payout.program.name}
            className="mr-1.5 size-4 rounded-sm"
          />
          <span>{payout.program.name}</span>
          <ExpandingArrow className="size-3" />
        </a>
      ),
      Period: formatPeriod(payout),

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
          {payout.type === "sales" && (
            <>
              <Table {...table} />
              {sales?.length === SHEET_MAX_ITEMS && (
                <div className="mt-2 flex justify-end">
                  <Link
                    href={`/programs/${payout.program.slug}/sales`}
                    className={cn(
                      buttonVariants({ variant: "secondary" }),
                      "flex h-7 items-center rounded-lg border px-2 text-sm",
                    )}
                  >
                    View all
                  </Link>
                </div>
              )}
            </>
          )}
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
