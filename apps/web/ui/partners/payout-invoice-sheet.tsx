import { confirmPayoutsAction } from "@/lib/actions/partners/confirm-payouts";
import { PAYOUT_FEES } from "@/lib/partners/constants";
import {
  CUTOFF_PERIOD,
  CUTOFF_PERIOD_TYPES,
} from "@/lib/partners/cutoff-period";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePaymentMethods from "@/lib/swr/use-payment-methods";
import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutResponse } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  CreditCard,
  Gear,
  GreekTemple,
  Sheet,
  SimpleTooltipContent,
  Table,
  Tooltip,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  capitalize,
  cn,
  currencyFormatter,
  fetcher,
  formatDate,
  OG_AVATAR_URL,
  truncate,
} from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

function PayoutInvoiceSheetContent() {
  const { id: workspaceId, slug, plan, defaultProgramId } = useWorkspace();
  const { queryParams } = useRouterStuff();
  const { paymentMethods, loading: paymentMethodsLoading } =
    usePaymentMethods();

  const paymentMethodsTypes = Object.freeze({
    link: {
      label: "link",
      type: "link",
      icon: CreditCard,
      fee: PAYOUT_FEES[plan?.split(" ")[0] ?? "business"].card,
      duration: "Instantly",
    },
    card: {
      label: "card",
      type: "card",
      icon: CreditCard,
      fee: PAYOUT_FEES[plan?.split(" ")[0] ?? "business"].card,
      duration: "Instantly",
    },
    us_bank_account: {
      label: "ACH",
      type: "us_bank_account",
      icon: GreekTemple,
      fee: PAYOUT_FEES[plan?.split(" ")[0] ?? "business"].ach,
      duration: "4 business days",
    },
  });

  type PaymentMethodWithFee =
    (typeof paymentMethodsTypes)[keyof typeof paymentMethodsTypes] & {
      id: string;
    };

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethodWithFee | null>(null);

  const [cutoffPeriod, setCutoffPeriod] =
    useState<CUTOFF_PERIOD_TYPES>("today");

  const {
    data: eligiblePayouts,
    error: eligiblePayoutsError,
    isLoading: eligiblePayoutsLoading,
  } = useSWR<PayoutResponse[]>(
    `/api/programs/${defaultProgramId}/payouts/confirm?${new URLSearchParams({
      workspaceId,
      cutoffPeriod,
    } as Record<string, any>).toString()}`,
    fetcher,
  );

  const { executeAsync, isPending } = useAction(confirmPayoutsAction, {
    onSuccess: async () => {
      await mutatePrefix(`/api/programs/${defaultProgramId}/payouts`);
      toast.success(
        "Payouts confirmed successfully! They will be processed soon.",
      );
      queryParams({
        del: "confirmPayouts",
      });
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  // Set the first payment method as the selected payment method
  useEffect(() => {
    if (!paymentMethods || !paymentMethods.length) {
      return;
    }

    if (!selectedPaymentMethod) {
      const firstPaymentMethod = paymentMethods[0];
      setSelectedPaymentMethod({
        ...paymentMethodsTypes[firstPaymentMethod.type],
        id: firstPaymentMethod.id,
      });
    }
  }, [paymentMethods, selectedPaymentMethod]);

  const paymentMethodsWithFee = useMemo(
    () =>
      paymentMethods?.map((pm) => ({
        ...paymentMethodsTypes[pm.type],
        id: pm.id,
        title: pm.link
          ? `Link – ${truncate(pm.link.email, 24)}`
          : pm.card
            ? `${capitalize(pm.card?.brand)} **** ${pm.card?.last4}`
            : `ACH **** ${pm.us_bank_account?.last4}`,
      })),
    [paymentMethods],
  );

  const invoiceData = useMemo(() => {
    const amount = eligiblePayouts?.reduce((acc, payout) => {
      return acc + payout.amount;
    }, 0);

    const fee =
      amount === undefined
        ? undefined
        : amount * (selectedPaymentMethod?.fee ?? 0);
    const total =
      amount !== undefined && fee !== undefined ? amount + fee : undefined;

    return {
      Method: (
        <div className="flex items-center gap-2 pr-6">
          {paymentMethodsLoading ? (
            <div className="h-[26px] w-full animate-pulse rounded-md bg-neutral-200" />
          ) : (
            <select
              className="h-auto flex-1 rounded-md border border-neutral-200 py-1 text-xs focus:border-neutral-600 focus:ring-neutral-600"
              value={selectedPaymentMethod?.id || ""}
              onChange={(e) =>
                setSelectedPaymentMethod(
                  paymentMethodsWithFee?.find(
                    (pm) => pm.id === e.target.value,
                  ) || null,
                )
              }
            >
              {paymentMethodsWithFee?.map(({ id, title }) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          )}
          <a
            href={`/${slug}/settings/billing`}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex items-center rounded-md border border-neutral-200 p-1 text-sm",
            )}
            target="_blank"
          >
            <Gear className="size-4" />
          </a>
        </div>
      ),

      "Cutoff Period": (
        <select
          value={cutoffPeriod}
          className="h-auto w-fit rounded-md border border-neutral-200 py-1 text-xs focus:border-neutral-600 focus:ring-neutral-600"
          onChange={(e) => setCutoffPeriod(e.target.value as any)}
        >
          {CUTOFF_PERIOD.map(({ id, label, value, default: isDefault }) => (
            <option key={id} value={id} selected={isDefault}>
              {label} ({formatDate(value)})
            </option>
          ))}
        </select>
      ),

      Amount:
        amount === undefined ? (
          <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
        ) : (
          currencyFormatter(amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        ),

      Fee:
        selectedPaymentMethod && fee !== undefined ? (
          <Tooltip
            content={
              <SimpleTooltipContent
                title={`${Math.round(selectedPaymentMethod.fee * 100)}% processing fee.${selectedPaymentMethod.type !== "us_bank_account" ? " Switch to ACH for a reduced fee." : ""}`}
                cta="Learn more"
                href="https://d.to/payouts"
              />
            }
          >
            <span className="underline decoration-dotted underline-offset-2">
              {currencyFormatter(fee / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </Tooltip>
        ) : (
          <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
        ),

      "Transfer Time": (
        <div>
          {selectedPaymentMethod ? (
            selectedPaymentMethod.duration
          ) : (
            <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
      ),

      Total:
        total === undefined ? (
          <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
        ) : (
          currencyFormatter(total / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        ),
    };
  }, [eligiblePayouts, paymentMethods, selectedPaymentMethod, cutoffPeriod]);

  const table = useTable({
    data: eligiblePayouts || [],
    columns: [
      {
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <img
              src={
                row.original.partner.image ||
                `${OG_AVATAR_URL}${row.original.partner.name}`
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
    loading: eligiblePayoutsLoading,
    error: eligiblePayoutsError
      ? "Failed to load payouts for this invoice."
      : undefined,
  } as any);

  useEffect(() => {
    if (eligiblePayouts) {
      table.table.toggleAllRowsSelected();
    }
  }, [eligiblePayouts]);

  return (
    <div className="flex h-full flex-col">
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

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 p-6">
          <div className="text-base font-medium text-neutral-900">
            Invoice details
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
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

        <div className="p-6 pt-2">
          <Table {...table} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
        <Button
          type="button"
          variant="primary"
          loading={isPending}
          disabled={
            eligiblePayoutsLoading ||
            !selectedPaymentMethod ||
            (typeof invoiceData.Amount === "string" &&
              invoiceData.Amount === "$0.00")
          }
          onClick={async () => {
            if (!workspaceId || !selectedPaymentMethod) {
              return;
            }

            await executeAsync({
              workspaceId,
              paymentMethodId: selectedPaymentMethod.id,
              cutoffPeriod,
            });
          }}
          text={
            typeof invoiceData.Amount === "string"
              ? `Confirm ${invoiceData.Amount} payout`
              : "Confirm payout"
          }
        />
      </div>
    </div>
  );
}

export function PayoutInvoiceSheet() {
  const { queryParams } = useRouterStuff();
  const [isOpen, setIsOpen] = useState(false);
  const { searchParams } = useRouterStuff();

  useEffect(() => {
    const confirmPayouts = searchParams.get("confirmPayouts");

    if (confirmPayouts) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [searchParams]);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
      onClose={() => {
        queryParams({
          del: "confirmPayouts",
        });
      }}
    >
      <PayoutInvoiceSheetContent />
    </Sheet>
  );
}
