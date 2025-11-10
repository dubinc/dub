import { confirmPayoutsAction } from "@/lib/actions/partners/confirm-payouts";
import { exceededLimitError } from "@/lib/api/errors";
import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import {
  DIRECT_DEBIT_PAYMENT_METHOD_TYPES,
  FAST_ACH_FEE_CENTS,
} from "@/lib/constants/payouts";
import {
  CUTOFF_PERIOD,
  CUTOFF_PERIOD_TYPES,
} from "@/lib/partners/cutoff-period";
import {
  calculatePayoutFeeForMethod,
  STRIPE_PAYMENT_METHODS,
} from "@/lib/stripe/payment-methods";
import usePaymentMethods from "@/lib/swr/use-payment-methods";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutResponse, PlanProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  CircleArrowRight,
  Combobox,
  ComboboxOption,
  DynamicTooltipWrapper,
  Gear,
  PaperPlane,
  Sheet,
  ShimmerDots,
  Table,
  TooltipContent,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  capitalize,
  cn,
  currencyFormatter,
  fetcher,
  formatDate,
  nFormatter,
  truncate,
} from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Stripe from "stripe";
import useSWR from "swr";
import { UpgradeRequiredToast } from "../shared/upgrade-required-toast";
import { ExternalPayoutsIndicator } from "./external-payouts-indicator";
import { PartnerRowItem } from "./partner-row-item";

type SelectPaymentMethod =
  (typeof STRIPE_PAYMENT_METHODS)[keyof typeof STRIPE_PAYMENT_METHODS] & {
    id: string;
    fee: number;
    fastSettlement: boolean;
  };

function ConfirmPayoutsSheetContent() {
  const router = useRouter();
  const { program } = useProgram();
  const {
    id: workspaceId,
    slug,
    plan,
    role,
    defaultProgramId,
    payoutsUsage,
    payoutsLimit,
    payoutFee,
    fastDirectDebitPayouts,
  } = useWorkspace();

  const { paymentMethods, loading: paymentMethodsLoading } =
    usePaymentMethods();

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<SelectPaymentMethod | null>(null);

  const [cutoffPeriod, setCutoffPeriod] =
    useState<CUTOFF_PERIOD_TYPES>("today");

  const { queryParams, searchParamsObj } = useRouterStuff();

  const selectedPayoutId = searchParamsObj.selectedPayoutId || undefined;

  const {
    data: eligiblePayouts,
    error: eligiblePayoutsError,
    isLoading: eligiblePayoutsLoading,
  } = useSWR<PayoutResponse[]>(
    `/api/programs/${defaultProgramId}/payouts/eligible?${new URLSearchParams({
      workspaceId,
      cutoffPeriod,
      ...(selectedPayoutId && { selectedPayoutId }),
    } as Record<string, any>).toString()}`,
    fetcher,
  );

  const excludedPayoutIds =
    searchParamsObj.excludedPayoutIds?.split(",").filter(Boolean) || [];

  const finalEligiblePayouts = useMemo(() => {
    // if there's a selected payout id, return the payout directly
    if (selectedPayoutId) return eligiblePayouts;

    // else, we need to filter out the excluded payout ids (if specified)
    return eligiblePayouts?.filter(
      (payout) => !excludedPayoutIds.includes(payout.id),
    );
  }, [eligiblePayouts, selectedPayoutId, excludedPayoutIds]);

  const { executeAsync: confirmPayouts } = useAction(confirmPayoutsAction, {
    onError: ({ error }) => {
      const PAYOUT_ERROR_MAP = {
        EXTERNAL_WEBHOOK_REQUIRED: {
          title: "Webhook required",
          ctaLabel: "Set up webhook",
          ctaUrl: `/${slug}/settings/webhooks`,
        },
      };

      if (error.serverError) {
        const code = Object.keys(PAYOUT_ERROR_MAP).find((key) =>
          error.serverError?.startsWith(key),
        );

        if (code) {
          const { title, ctaLabel, ctaUrl } = PAYOUT_ERROR_MAP[code];
          const message =
            error.serverError.replace(`${code}: `, "") || "An error occurred.";

          return toast.custom(() => (
            <UpgradeRequiredToast
              title={title}
              message={message}
              ctaLabel={ctaLabel}
              ctaUrl={ctaUrl}
            />
          ));
        }
      }

      toast.error(error.serverError);
    },
  });

  const finalPaymentMethods = useMemo(() => {
    if (!paymentMethods) return undefined;

    const methods = paymentMethods.flatMap((pm) => {
      const paymentMethod = STRIPE_PAYMENT_METHODS[pm.type];

      const base = {
        ...paymentMethod,
        id: pm.id,
        fastSettlement: false,
        fee: calculatePayoutFeeForMethod({
          paymentMethod: pm.type,
          payoutFee,
        }),
      };

      if (pm.link) {
        return {
          ...base,
          title: `Link – ${truncate(pm.link.email, 24)}`,
        };
      }

      if (pm.card) {
        return {
          ...base,
          title: `${capitalize(pm.card.brand)} **** ${pm.card.last4}`,
        };
      }

      if (paymentMethod.type === "us_bank_account") {
        const methods = [
          {
            ...base,
            title: `ACH **** ${pm[paymentMethod.type]?.last4}`,
          },
        ];

        if (fastDirectDebitPayouts) {
          methods.unshift({
            ...base,
            id: `${pm.id}-fast`,
            title: `Fast ACH **** ${pm[paymentMethod.type]?.last4}`,
            duration: "2 business days",
            fastSettlement: true,
          });
        }

        return methods;
      }

      return {
        ...base,
        title: `${paymentMethod.label} **** ${pm[paymentMethod.type]?.last4}`,
      };
    });

    return methods;
  }, [paymentMethods, payoutFee, fastDirectDebitPayouts]);

  const paymentMethodOptions = useMemo(() => {
    return finalPaymentMethods?.map((method) => ({
      value: method.id,
      label: method.title,
      icon: method.icon,
      ...(method.fastSettlement && {
        meta: `+ ${currencyFormatter(FAST_ACH_FEE_CENTS / 100, { trailingZeroDisplay: "stripIfInteger" })}`,
      }),
    }));
  }, [finalPaymentMethods]);

  const selectedPaymentMethodOption = useMemo(() => {
    if (!selectedPaymentMethod) return null;

    const option = paymentMethodOptions?.find(
      (option) => option.value === selectedPaymentMethod.id,
    );

    return option || null;
  }, [selectedPaymentMethod, paymentMethodOptions]);

  const cutoffPeriodOptions = useMemo(() => {
    return CUTOFF_PERIOD.map(({ id, label, value }) => ({
      value: id,
      label: `${label} (${formatDate(value)})`,
    }));
  }, []);

  const selectedCutoffPeriodOption = useMemo(() => {
    return (
      cutoffPeriodOptions.find((option) => option.value === cutoffPeriod) ||
      null
    );
  }, [cutoffPeriod, cutoffPeriodOptions]);

  useEffect(() => {
    if (
      !selectedPaymentMethod &&
      finalPaymentMethods &&
      finalPaymentMethods.length > 0
    ) {
      setSelectedPaymentMethod(finalPaymentMethods[0]);
    }
  }, [finalPaymentMethods, selectedPaymentMethod]);

  const isExternalPayout = (payout: PayoutResponse) => {
    switch (program?.payoutMode) {
      case "internal":
        return false;
      case "external":
        return true;
      case "hybrid":
        return payout.partner.payoutsEnabledAt === null;
      default:
        return false;
    }
  };

  const { amount, fee, total, fastAchFee, externalAmount } = useMemo(() => {
    const amount = finalEligiblePayouts?.reduce((acc, payout) => {
      return acc + payout.amount;
    }, 0);

    if (
      amount === undefined ||
      selectedPaymentMethod === null ||
      program?.payoutMode === undefined
    ) {
      return {
        amount: undefined,
        externalAmount: undefined,
        fee: undefined,
        total: undefined,
        fastAchFee: undefined,
      };
    }

    // Calculate the total external amount
    const externalAmount = finalEligiblePayouts?.reduce(
      (acc, payout) =>
        isExternalPayout(payout) ? acc + payout.amount : acc + 0,
      0,
    );

    const fastAchFee = selectedPaymentMethod.fastSettlement
      ? FAST_ACH_FEE_CENTS
      : 0;

    const fee = Math.round(amount * selectedPaymentMethod.fee + fastAchFee);
    const total = amount + fee;

    return {
      amount,
      externalAmount,
      fee,
      total,
      fastAchFee,
    };
  }, [finalEligiblePayouts, selectedPaymentMethod, program?.payoutMode]);

  const invoiceData = useMemo(() => {
    return [
      {
        key: "Method",
        value: (
          <div className="flex w-full items-center justify-between gap-2">
            {paymentMethodsLoading ? (
              <div className="h-[30px] w-full animate-pulse rounded-md bg-neutral-200" />
            ) : (
              <div className="flex-1">
                <Combobox
                  options={paymentMethodOptions}
                  selected={selectedPaymentMethodOption}
                  setSelected={(option: ComboboxOption) => {
                    if (!option) {
                      return;
                    }

                    const selectedMethod = finalPaymentMethods?.find(
                      (pm) => pm.id === option.value,
                    );

                    setSelectedPaymentMethod(selectedMethod || null);
                  }}
                  optionRight={(option) => {
                    return option.meta ? (
                      <span className="rounded-md bg-neutral-100 px-1 py-0.5 text-xs font-semibold text-neutral-700">
                        {option.meta}
                      </span>
                    ) : null;
                  }}
                  placeholder="Select payment method"
                  buttonProps={{
                    className:
                      "h-auto border border-neutral-200 px-3 py-1.5 text-xs focus:border-neutral-600 focus:ring-neutral-600",
                  }}
                  matchTriggerWidth
                  hideSearch
                  caret
                >
                  <div className="flex items-center gap-2">
                    {selectedPaymentMethodOption ? (
                      <>
                        <selectedPaymentMethodOption.icon className="size-4" />
                        {selectedPaymentMethodOption.label}
                      </>
                    ) : (
                      <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
                    )}
                  </div>
                </Combobox>
              </div>
            )}

            <a
              href={`/${slug}/settings/billing`}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex items-center rounded-md border border-neutral-200 p-1.5 text-sm",
              )}
              target="_blank"
            >
              <Gear className="size-4" />
            </a>
          </div>
        ),
      },
      {
        key: "Cutoff Period",
        value: (
          <div className="w-full">
            <Combobox
              options={cutoffPeriodOptions}
              selected={selectedCutoffPeriodOption}
              setSelected={(option: ComboboxOption) => {
                if (!option) {
                  return;
                }

                setCutoffPeriod(option.value as CUTOFF_PERIOD_TYPES);
              }}
              placeholder="Select cutoff period"
              buttonProps={{
                className:
                  "h-auto border border-neutral-200 px-3 py-1.5 text-xs focus:border-neutral-600 focus:ring-neutral-600",
              }}
              matchTriggerWidth
              hideSearch
              caret
            />
          </div>
        ),
        tooltipContent:
          "Cutoff period in UTC. If set, only commissions accrued up to the cutoff period will be included in the payout invoice.",
      },
      {
        key: "Partners",
        value: eligiblePayouts ? (
          nFormatter(eligiblePayouts.length, { full: true })
        ) : (
          <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
        ),
      },
      {
        key: "Amount",
        value:
          amount === undefined ? (
            <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
          ) : (
            currencyFormatter(amount / 100)
          ),
      },
      ...(finalEligiblePayouts && finalEligiblePayouts.some(isExternalPayout)
        ? [
            {
              key: "External Amount",
              value:
                externalAmount === undefined ? (
                  <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
                ) : (
                  <div className="flex items-center gap-1.5">
                    {currencyFormatter(externalAmount / 100)}
                    <CircleArrowRight className="size-3.5 text-neutral-500" />
                  </div>
                ),
              tooltipContent: `Payouts that are processed externally via the \`payout.confirmed\` [webhook event](${`/${slug}/settings/webhooks`}). [Learn more about external payouts](http://dub.co/docs/partners/external-payouts).`,
            },
          ]
        : []),
      {
        key: "Fee",
        value:
          selectedPaymentMethod && fee !== undefined ? (
            currencyFormatter(fee / 100)
          ) : (
            <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
          ),
        tooltipContent: selectedPaymentMethod
          ? `${selectedPaymentMethod.fee * 100}% processing fee${(fastAchFee ?? 0) > 0 ? ` + ${currencyFormatter((fastAchFee ?? 0) / 100)} Fast ACH fee` : ""}. ${!DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(selectedPaymentMethod.type as Stripe.PaymentMethod.Type) ? " Switch to Direct Debit for a reduced fee." : ""} [Learn more](https://d.to/payouts)`
          : undefined,
      },
      {
        key: "Transfer Time",
        value: selectedPaymentMethod ? (
          selectedPaymentMethod.duration
        ) : (
          <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
        ),
      },
      {
        key: "Total",
        value:
          total === undefined ? (
            <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
          ) : (
            currencyFormatter(total / 100)
          ),
      },
    ];
  }, [
    amount,
    externalAmount,
    paymentMethods,
    selectedPaymentMethod,
    cutoffPeriod,
    cutoffPeriodOptions,
    selectedCutoffPeriodOption,
  ]);

  const partnerColumn = useMemo(
    () => ({
      header: "Partner",
      cell: ({ row }) => (
        <PartnerRowItem
          partner={{
            id: row.original.partner.id,
            name: row.original.partner.name,
            image: row.original.partner.image,
          }}
          showPermalink={false}
        />
      ),
    }),
    [],
  );

  const table = useTable({
    data: eligiblePayouts || [],
    columns: [
      partnerColumn,
      {
        id: "total",
        header: "Total",
        cell: ({ row }) => (
          <>
            <div className="relative flex items-center justify-end gap-1.5">
              <span
                className={cn(
                  !selectedPayoutId && "group-hover/row:opacity-0",
                  excludedPayoutIds.includes(row.original.id) && "line-through",
                )}
              >
                {currencyFormatter(row.original.amount / 100)}
              </span>

              {!selectedPayoutId && (
                <div className="pointer-events-none absolute right-[calc(14px+0.375rem)] top-1/2 -translate-y-1/2 opacity-0 group-hover/row:pointer-events-auto group-hover/row:opacity-100">
                  <Button
                    variant="secondary"
                    text={
                      excludedPayoutIds.includes(row.original.id)
                        ? "Include"
                        : "Exclude"
                    }
                    className="h-6 w-fit px-2"
                    onClick={() =>
                      // Toggle excluded
                      queryParams({
                        set: {
                          excludedPayoutIds: excludedPayoutIds.includes(
                            row.original.id,
                          )
                            ? excludedPayoutIds.filter(
                                (id) => id !== row.original.id,
                              )
                            : [...excludedPayoutIds, row.original.id],
                        },
                        replace: true,
                      })
                    }
                  />
                </div>
              )}

              {isExternalPayout(row.original) && (
                <ExternalPayoutsIndicator side="left" />
              )}
            </div>
          </>
        ),
      },
    ],
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id, row) =>
      cn(
        "transition-opacity",
        excludedPayoutIds.includes(row.original.id) && [
          "[&>div]:opacity-50",
          id === "total" && "group-hover/row:[&>div]:opacity-100",
        ], // Excluded payout
        id === "total" && "text-right",
        "border-l-0",
      ),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `eligible payout${p ? "s" : ""}`,
    loading: eligiblePayoutsLoading,
    error: eligiblePayoutsError
      ? "Failed to load payouts for this invoice."
      : undefined,
  });

  const { error: permissionsError } = clientAccessCheck({
    role,
    action: "payouts.write",
    customPermissionDescription: "confirm payouts",
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Confirm payouts
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
          <div className="grid grid-cols-3 gap-2 text-sm">
            {invoiceData.map(({ key, value, tooltipContent }) => (
              <Fragment key={key}>
                <div
                  className={cn(
                    "flex items-center py-0.5 font-medium text-neutral-500",
                    tooltipContent &&
                      "cursor-help underline decoration-dotted underline-offset-2",
                  )}
                >
                  <DynamicTooltipWrapper
                    tooltipProps={
                      tooltipContent
                        ? {
                            content: tooltipContent,
                          }
                        : undefined
                    }
                  >
                    {key}
                  </DynamicTooltipWrapper>
                </div>
                <div className="col-span-2 flex items-center text-neutral-800">
                  {value}
                </div>
              </Fragment>
            ))}
          </div>
        </div>

        <div className="px-6 py-3">
          <Table {...table} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
        <ConfirmPayoutsButton
          onClick={async () => {
            if (!workspaceId || !selectedPaymentMethod) {
              return false;
            }

            const result = await confirmPayouts({
              workspaceId,
              paymentMethodId: selectedPaymentMethod.id.replace("-fast", ""),
              fastSettlement: selectedPaymentMethod.fastSettlement,
              cutoffPeriod,
              selectedPayoutId,
              excludedPayoutIds,
              amount: amount ?? 0,
              fee: fee ?? 0,
              total: total ?? 0,
            });

            if (!result?.data?.invoiceId) return false;

            setTimeout(
              () =>
                result?.data?.invoiceId &&
                router.push(
                  `/${slug}/program/payouts/success?invoiceId=${result.data.invoiceId}`,
                ),
              1000,
            );

            return true;
          }}
          text={
            amount && amount > 0
              ? `Hold to confirm ${currencyFormatter(amount / 100)} payout`
              : "Hold to confirm payout"
          }
          disabled={
            eligiblePayoutsLoading || !selectedPaymentMethod || amount === 0
          }
          disabledTooltip={
            payoutsUsage &&
            payoutsLimit &&
            amount &&
            payoutsUsage + amount > payoutsLimit ? (
              <TooltipContent
                title={exceededLimitError({
                  plan: plan as PlanProps,
                  limit: payoutsLimit,
                  type: "payouts",
                })}
                cta="Upgrade"
                href={`/${slug}/settings/billing/upgrade`}
              />
            ) : amount && amount < 1000 ? (
              "Your payout total is less than the minimum invoice amount of $10."
            ) : (
              permissionsError || undefined
            )
          }
        />
      </div>
    </div>
  );
}

export function ConfirmPayoutsSheet() {
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
          del: ["confirmPayouts", "selectedPayoutId", "excludedPayoutIds"],
        });
      }}
    >
      <ConfirmPayoutsSheetContent />
    </Sheet>
  );
}

function ConfirmPayoutsButton({
  onClick,
  text,
  disabled,
  disabledTooltip,
}: {
  onClick: () => Promise<boolean>;
  text: string;
  disabled: boolean;
  disabledTooltip: React.ReactNode;
}) {
  const loadingBar = useRef<HTMLDivElement>(null);

  const holding = useRef(false);
  const progress = useRef(0);

  const requestRef = useRef<number | null>(undefined);
  const previousTimeRef = useRef(undefined);

  // Rounded progress to nearest tenth
  const [roundedProgress, setRoundedProgress] = useState(0);

  const [isSuccess, setIsSuccess] = useState(false);

  const animate = (time) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;

      if (progress.current < 1) {
        progress.current = Math.max(
          0,
          Math.min(
            1,
            progress.current + deltaTime * (holding.current ? 0.0005 : -0.001),
          ),
        );

        setRoundedProgress(Math.round(progress.current * 10) / 10);

        if (loadingBar.current)
          loadingBar.current.style.width = `${progress.current * 100}%`;
      }
    }

    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  const submitting = useRef(false);

  // Submit when the progress is >= 1 and not already submitting
  useEffect(() => {
    if (roundedProgress < 1 || submitting.current) return;

    submitting.current = true;
    onClick()
      .then((result) => {
        if (result) {
          setIsSuccess(true);
        } else {
          progress.current = 0;
          setRoundedProgress(0);
          submitting.current = false;
        }
      })
      .catch(() => {
        progress.current = 0;
        setRoundedProgress(0);
        submitting.current = false;
      });
  }, [roundedProgress]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  return (
    <Button
      type="button"
      variant="primary"
      className={cn(
        "relative overflow-hidden",
        isSuccess && "border-green-500 bg-green-500",
      )}
      textWrapperClassName="!overflow-visible select-none"
      {...(!disabled &&
        !disabledTooltip && {
          // TODO: Handle keyboard control
          onPointerDown: () => (holding.current = true),
          onPointerUp: () => (holding.current = false),
          onPointerLeave: () => (holding.current = false),
          onPointerCancel: () => (holding.current = false),
        })}
      text={
        <>
          <div
            ref={loadingBar}
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 overflow-hidden",
              !isSuccess && "bg-[linear-gradient(90deg,#fff1,#fff4)]",
            )}
          >
            <ShimmerDots
              className="inset-[unset] inset-y-0 left-0 w-[600px] opacity-30"
              color={[1, 1, 1]}
            />
          </div>
          <div className="relative text-center">
            <div
              className={cn(
                "transition-[transform,opacity] duration-300",
                roundedProgress >= 0.5 && "-translate-y-4 opacity-0",
              )}
            >
              {text}
            </div>
            <div
              className={cn(
                "pointer-events-none absolute inset-0 transition-[transform,opacity] duration-300",
                roundedProgress < 0.5 && "translate-y-4 opacity-0",
                roundedProgress >= 1 && "-translate-y-4 opacity-0",
              )}
              aria-hidden
            >
              Preparing payout...
            </div>
            <div
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center transition-[transform,opacity] duration-300",
                roundedProgress < 1 && "-translate-x-1 translate-y-4 opacity-0",
                roundedProgress >= 1 &&
                  isSuccess &&
                  "-translate-y-4 translate-x-3 opacity-0",
              )}
              aria-hidden
            >
              <PaperPlane className="size-4" />
            </div>
            <div
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center transition-[transform,opacity] duration-300",
                (roundedProgress < 1 || !isSuccess) &&
                  "translate-y-4 opacity-0",
              )}
              aria-hidden
            >
              Payout sent
            </div>
          </div>
        </>
      }
      disabled={disabled}
      disabledTooltip={disabledTooltip}
    />
  );
}
