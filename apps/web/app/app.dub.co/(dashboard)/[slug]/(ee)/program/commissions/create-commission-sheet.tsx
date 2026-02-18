import { createManualCommissionAction } from "@/lib/actions/partners/create-manual-commission";
import { handleMoneyKeyDown } from "@/lib/form-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useRewards from "@/lib/swr/use-rewards";
import useWorkspace from "@/lib/swr/use-workspace";
import { createCommissionSchema } from "@/lib/zod/schemas/commissions";
import { CustomerSelector } from "@/ui/customers/customer-selector";
import { PartnerLinkSelector } from "@/ui/partners/partner-link-selector";
import { PartnerSelector } from "@/ui/partners/partner-selector";
import {
  ProgramSheetAccordion,
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { X } from "@/ui/shared/icons";
import { CommissionType } from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  Button,
  LoadingSpinner,
  Sheet,
  SmartDateTimePicker,
  Switch,
  ToggleGroup,
} from "@dub/ui";
import { cn, currencyFormatter, formatDate } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";
import * as z from "zod/v4";

interface CreateCommissionSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

type FormData = z.infer<typeof createCommissionSchema>;

// API returns created as ISO string after JSON serialization
type StripeInvoiceFromApi = {
  id: string;
  amount_paid: number;
  created: string;
};

async function fetcherStripeInvoices(url: string): Promise<{
  invoices: StripeInvoiceFromApi[];
  noStripeCustomerId?: boolean;
  message?: string;
}> {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 400 && body?.error?.message) {
      return {
        invoices: [],
        noStripeCustomerId: true,
        message: body.error.message,
      };
    }
    throw new Error(body?.error?.message ?? "Failed to load invoices");
  }
  return { invoices: Array.isArray(body) ? body : [] };
}

function CreateCommissionSheetContent({
  setIsOpen,
}: CreateCommissionSheetProps) {
  const { id: workspaceId, defaultProgramId, slug } = useWorkspace();
  const [hasInvoiceId, setHasInvoiceId] = useState(false);
  const [hasProductId, setHasProductId] = useState(false);
  const [hasDate, setHasDate] = useState(false);
  const [hasSaleEventDate, setHasSaleEventDate] = useState(false);

  const [hasCustomLeadEventDate, setHasCustomLeadEventDate] = useState(false);
  const [hasCustomLeadEventName, setHasCustomLeadEventName] = useState(false);
  const [useExistingEvents, setUseExistingEvents] = useState(false);

  const [commissionType, setCommissionType] =
    useState<CommissionType>("custom");

  type AccordionValue =
    | "partner-and-type"
    | "customer-and-commission"
    | "commission";
  const [openAccordions, setOpenAccordions] = useState<AccordionValue[]>([
    "partner-and-type",
  ]);

  const params = useParams() as { partnerId: string };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    control,
  } = useForm<FormData>({
    defaultValues: {
      partnerId: params.partnerId,
    },
  });

  const [
    partnerId,
    date,
    amount,
    linkId,
    customerId,
    saleEventDate,
    saleAmount,
    leadEventDate,
    description,
  ] = watch([
    "partnerId",
    "date",
    "amount",
    "linkId",
    "customerId",
    "saleEventDate",
    "saleAmount",
    "leadEventDate",
    "description",
  ]);

  const { rewards } = useRewards();
  const hasLeadRewards = rewards?.some((reward) => reward.event === "lead");

  const commissionTypeOptions = [
    {
      value: "custom",
      label: "One-time",
      description:
        "Pay a one-time commission to a partner (e.g. bonuses, reimbursements, etc.)",
    },
    ...(hasLeadRewards
      ? [
          {
            value: "lead",
            label: "Lead",
            description: "Reward a partner for a qualified signup/referral.",
          },
        ]
      : []),
    {
      value: "sale",
      label: "Recurring sale",
      description:
        "Reward a partner for a recurring subscription from a referred customer.",
    },
  ];

  const eventSourceOptions = [
    {
      value: "new",
      label: "Create new event",
      description:
        "Create a new sale event for the partner (e.g. for one-time purchases)",
    },
    {
      value: "existing",
      label: "Import from Stripe",
      description:
        "Fetch the customer's paid invoices from Stripe (e.g. for recurring subscriptions)",
    },
  ];

  // Fetch Stripe invoices when customer is selected and we're using existing events
  const {
    data: stripeInvoicesData,
    isLoading: isStripeInvoicesLoading,
    error: stripeInvoicesError,
  } = useSWR(
    customerId && useExistingEvents && commissionType === "sale" && workspaceId
      ? `/api/customers/${customerId}/stripe-invoices?workspaceId=${workspaceId}`
      : null,
    fetcherStripeInvoices,
  );

  const stripeInvoices = stripeInvoicesData?.invoices ?? [];
  const noStripeCustomerId = stripeInvoicesData?.noStripeCustomerId ?? false;
  const noStripeCustomerMessage = stripeInvoicesData?.message;

  useEffect(() => {
    if (commissionType === "custom") {
      setValue("linkId", null);
    }
  }, [commissionType, setValue]);

  useEffect(() => {
    if (!hasCustomLeadEventDate) {
      setValue("leadEventDate", null);
    }
  }, [hasCustomLeadEventDate, setValue]);

  useEffect(() => {
    if (!hasDate) {
      setValue("date", null);
    }
  }, [hasDate, setValue]);

  useEffect(() => {
    if (!hasSaleEventDate) {
      setValue("saleEventDate", null);
    }
  }, [hasSaleEventDate, setValue]);

  useEffect(() => {
    if (commissionType === "custom") {
      setOpenAccordions(["partner-and-type", "commission"]);
    } else {
      setOpenAccordions(["partner-and-type", "customer-and-commission"]);
    }
  }, [commissionType]);

  const { executeAsync, isPending } = useAction(createManualCommissionAction, {
    onSuccess: async () => {
      toast.success("A commission has been created for the partner!");
      setIsOpen(false);
      await mutatePrefix(`/api/commissions?workspaceId=${workspaceId}`);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !defaultProgramId) {
      toast.error("Please fill all required fields.");
      return;
    }

    const date = data.date ? new Date(data.date).toISOString() : null;

    const saleEventDate = data.saleEventDate
      ? new Date(data.saleEventDate).toISOString()
      : null;

    const leadEventDate = data.leadEventDate
      ? new Date(data.leadEventDate).toISOString()
      : null;

    await executeAsync({
      ...data,
      commissionType,
      partnerId,
      workspaceId,
      date,
      amount: data.amount ? data.amount * 100 : null,
      saleAmount: data.saleAmount ? data.saleAmount * 100 : null,
      saleEventDate,
      leadEventDate,
      useExistingEvents,
    });
  };

  const submitDisabledMessage = useMemo(() => {
    if (!partnerId) {
      return "You need to select a partner first before you can create a commission.";
    }

    if (commissionType === "custom") {
      return !amount
        ? "You need to enter an amount for the commission."
        : undefined;
    }

    if (!linkId || !customerId) {
      return "You need to select a customer and a link first before you can create a commission.";
    }

    if (commissionType === "sale") {
      if (useExistingEvents) {
        if (isStripeInvoicesLoading) {
          return "Loading Stripe invoices...";
        }

        if (noStripeCustomerId) {
          return "This customer doesn't have a Stripe customer ID. Add one in the customer profile before proceeding.";
        }

        if (stripeInvoices.length === 0) {
          return "No paid Stripe invoices found for this customer.";
        }
      } else {
        if (!saleAmount) {
          return "You need to enter a sale amount for the commission.";
        }
      }
    }

    return false;
  }, [
    commissionType,
    partnerId,
    linkId,
    customerId,
    amount, // custom commission amount
    saleAmount, // sale commission amount
    useExistingEvents,
    noStripeCustomerId,
    stripeInvoices.length,
    isStripeInvoicesLoading,
  ]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Create commission
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

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <ProgramSheetAccordion
            type="multiple"
            value={openAccordions}
            onValueChange={(value) =>
              setOpenAccordions(value as AccordionValue[])
            }
            className="space-y-6"
          >
            <ProgramSheetAccordionItem value="partner-and-type">
              <ProgramSheetAccordionTrigger>
                Partner and commission type
              </ProgramSheetAccordionTrigger>
              <ProgramSheetAccordionContent>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label
                      htmlFor="partnerId"
                      className="flex items-center space-x-2"
                    >
                      <h2 className="text-sm font-medium text-neutral-900">
                        Partner
                      </h2>
                    </label>
                    <div className="relative mt-2 rounded-md shadow-sm">
                      <PartnerSelector
                        selectedPartnerId={partnerId}
                        setSelectedPartnerId={(id) => setValue("partnerId", id)}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="commissionType">
                      <h2 className="text-sm font-medium text-neutral-900">
                        Commission type
                      </h2>
                    </label>
                    <ToggleGroup
                      className="mt-2 flex w-full items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-1"
                      optionClassName="h-8 flex items-center justify-center rounded-md flex-1 text-sm normal-case"
                      indicatorClassName="bg-white"
                      options={commissionTypeOptions}
                      selected={commissionType}
                      selectAction={(id: CommissionType) =>
                        setCommissionType(id)
                      }
                    />
                    <p className="mt-2 text-xs text-neutral-500">
                      {
                        commissionTypeOptions.find(
                          (option) => option.value === commissionType,
                        )?.description
                      }
                    </p>
                  </div>

                  {commissionType !== "custom" && (
                    <AnimatedSizeContainer
                      height
                      transition={{ ease: "easeInOut", duration: 0.2 }}
                      style={{
                        height:
                          commissionType === "lead" || commissionType === "sale"
                            ? "auto"
                            : "0px",
                        overflow: "hidden",
                      }}
                    >
                      <div>
                        <label
                          htmlFor="linkId"
                          className="flex items-center space-x-2"
                        >
                          <h2 className="text-sm font-medium text-neutral-900">
                            Referral link
                          </h2>
                        </label>
                        <div className="mt-2 p-px">
                          <PartnerLinkSelector
                            selectedLinkId={linkId ?? null}
                            showDestinationUrl={false}
                            partnerId={partnerId}
                            setSelectedLinkId={(id) =>
                              setValue("linkId", id, { shouldDirty: true })
                            }
                            disabledTooltip={
                              !partnerId
                                ? "You need to select a partner first before you can select a link"
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </AnimatedSizeContainer>
                  )}
                </div>
              </ProgramSheetAccordionContent>
            </ProgramSheetAccordionItem>

            {commissionType === "custom" && (
              <ProgramSheetAccordionItem value="commission">
                <ProgramSheetAccordionTrigger>
                  Commission
                </ProgramSheetAccordionTrigger>
                <ProgramSheetAccordionContent>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label
                        htmlFor="amount"
                        className="text-sm font-medium text-neutral-800"
                      >
                        Amount
                      </label>
                      <div className="relative mt-2 rounded-md shadow-sm">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                          $
                        </span>
                        <Controller
                          name="amount"
                          control={control}
                          rules={{
                            required: true,
                            min: 0,
                          }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              onWheel={(e) => e.currentTarget.blur()}
                              className={cn(
                                "block w-full rounded-md border-neutral-300 pl-6 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                                errors.amount &&
                                  "border-red-600 focus:border-red-500 focus:ring-red-600",
                              )}
                              value={
                                field.value == null || isNaN(field.value)
                                  ? ""
                                  : field.value
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(
                                  val === "" ? null : parseFloat(val),
                                );
                              }}
                              onKeyDown={handleMoneyKeyDown}
                              placeholder="0.00"
                            />
                          )}
                        />
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                          USD
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="description"
                          className="text-sm font-medium text-neutral-800"
                        >
                          Description
                          <span className="font-normal text-neutral-500">
                            {" "}
                            (optional)
                          </span>
                        </label>
                        <span className="text-xs text-neutral-400">
                          {description?.length || 0}/190
                        </span>
                      </div>
                      <div className="mt-2">
                        <textarea
                          id="description"
                          rows={3}
                          maxLength={190}
                          className={cn(
                            "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                            errors.description &&
                              "border-red-600 focus:border-red-500 focus:ring-red-600",
                          )}
                          placeholder="Add a description for this commission"
                          {...register("description", {
                            setValueAs: (value) =>
                              value === "" ? null : value,
                          })}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-4">
                        <Switch
                          fn={setHasDate}
                          checked={hasDate}
                          trackDimensions="w-8 h-4"
                          thumbDimensions="w-3 h-3"
                          thumbTranslate="translate-x-4"
                        />
                        <h3 className="text-sm font-medium text-neutral-700">
                          Add a custom date
                        </h3>
                      </div>

                      {hasDate && (
                        <div className="mt-4">
                          <SmartDateTimePicker
                            value={date}
                            onChange={(date) => {
                              setValue("date", date, {
                                shouldDirty: true,
                              });
                            }}
                            label="Custom date"
                            placeholder='E.g. "2024-03-01", "Last Thursday", "2 hours ago"'
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </ProgramSheetAccordionContent>
              </ProgramSheetAccordionItem>
            )}

            {(commissionType === "sale" || commissionType === "lead") && (
              <ProgramSheetAccordionItem value="customer-and-commission">
                <ProgramSheetAccordionTrigger>
                  Customer and commission details
                </ProgramSheetAccordionTrigger>
                <ProgramSheetAccordionContent>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="flex items-center space-x-2"
                      >
                        <h2 className="text-sm font-medium text-neutral-900">
                          Customer
                        </h2>
                      </label>
                      <div className="mt-2">
                        <CustomerSelector
                          selectedCustomerId={customerId ?? ""}
                          setSelectedCustomerId={(id) => {
                            setValue("customerId", id, { shouldDirty: true });
                          }}
                        />
                      </div>
                    </div>

                    {customerId && (
                      <div>
                        <label htmlFor="eventSource">
                          <h2 className="text-sm font-medium text-neutral-900">
                            Event source
                          </h2>
                        </label>
                        <ToggleGroup
                          className="mt-2 flex w-full items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1"
                          optionClassName="h-8 flex items-center justify-center rounded-md flex-1 text-sm normal-case"
                          indicatorClassName="bg-white"
                          options={eventSourceOptions}
                          selected={useExistingEvents ? "existing" : "new"}
                          selectAction={(value: string) =>
                            setUseExistingEvents(value === "existing")
                          }
                        />
                        <p className="mt-2 text-xs text-neutral-500">
                          {
                            eventSourceOptions.find(
                              (option) =>
                                option.value ===
                                (useExistingEvents ? "existing" : "new"),
                            )?.description
                          }
                        </p>
                      </div>
                    )}

                    {/* Stripe invoices for sale + use existing */}
                    {customerId &&
                      useExistingEvents &&
                      commissionType === "sale" && (
                        <div className="space-y-3">
                          {isStripeInvoicesLoading ? (
                            <div className="flex h-40 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50/50">
                              <LoadingSpinner />
                            </div>
                          ) : noStripeCustomerId ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                              <p className="text-sm font-medium text-amber-800">
                                No Stripe customer ID
                              </p>
                              <p className="mt-1 text-xs text-amber-700">
                                {noStripeCustomerMessage ??
                                  "This customer doesn't have a Stripe customer ID. Add one in the customer profile to use paid Stripe invoices here."}
                              </p>
                              <a
                                href={`/${slug}/program/customers/${customerId}`}
                                target="_blank"
                                className="mt-2 inline-block text-xs font-medium text-amber-800 underline hover:no-underline"
                              >
                                Open customer profile →
                              </a>
                            </div>
                          ) : stripeInvoicesError ? (
                            <div className="rounded-lg border border-red-200 bg-red-50/80 p-4 text-sm text-red-800">
                              Failed to load invoices. Try again.
                            </div>
                          ) : stripeInvoices.length === 0 ? (
                            <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50/30 text-center">
                              <p className="text-sm font-medium text-neutral-600">
                                No paid invoices found
                              </p>
                              <p className="mt-0.5 text-xs text-neutral-500">
                                This customer has no paid invoices in Stripe.
                              </p>
                            </div>
                          ) : (
                            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
                              <div className="border-b border-neutral-100 bg-neutral-50/80 px-3 py-2">
                                <p className="text-xs font-medium text-neutral-500">
                                  Paid invoices ({stripeInvoices.length})
                                </p>
                              </div>
                              <div className="max-h-96 overflow-y-auto p-1.5">
                                {stripeInvoices.map((inv) => {
                                  const createdDate = new Date(inv.created);
                                  return (
                                    <div
                                      key={inv.id}
                                      className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <a
                                          href={`https://dashboard.stripe.com/invoices/${inv.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="cursor-alias font-mono text-sm font-medium text-neutral-800 decoration-dotted underline-offset-2 hover:underline"
                                        >
                                          {inv.id}
                                        </a>
                                        <p className="mt-0.5 text-xs text-neutral-500">
                                          {formatDate(createdDate)}
                                        </p>
                                      </div>
                                      <span className="shrink-0 text-sm font-medium text-neutral-700">
                                        {currencyFormatter(inv.amount_paid)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    {customerId &&
                      !useExistingEvents &&
                      (commissionType === "lead" ? (
                        <>
                          <AnimatedSizeContainer
                            height
                            transition={{ ease: "easeInOut", duration: 0.2 }}
                            style={{
                              height: hasCustomLeadEventDate ? "auto" : "0px",
                              overflow: "hidden",
                            }}
                          >
                            <div className="flex flex-col gap-6">
                              <div className="flex items-center gap-4">
                                <Switch
                                  fn={setHasCustomLeadEventDate}
                                  checked={hasCustomLeadEventDate}
                                  trackDimensions="w-8 h-4"
                                  thumbDimensions="w-3 h-3"
                                  thumbTranslate="translate-x-4"
                                />
                                <div className="flex flex-col gap-1">
                                  <h3 className="text-sm font-medium text-neutral-700">
                                    Set a custom lead event date
                                  </h3>
                                </div>
                              </div>

                              {hasCustomLeadEventDate && (
                                <div className="p-px">
                                  <SmartDateTimePicker
                                    value={leadEventDate}
                                    onChange={(date) => {
                                      setValue("leadEventDate", date, {
                                        shouldDirty: true,
                                      });
                                    }}
                                    label="Lead event date"
                                    placeholder='E.g. "2024-03-01", "Last Thursday", "2 hours ago"'
                                  />
                                </div>
                              )}
                            </div>
                          </AnimatedSizeContainer>
                          <AnimatedSizeContainer
                            height
                            transition={{ ease: "easeInOut", duration: 0.2 }}
                            style={{
                              height: hasCustomLeadEventName ? "auto" : "0px",
                              overflow: "hidden",
                            }}
                          >
                            <div className="flex flex-col gap-6">
                              <div className="flex items-center gap-4">
                                <Switch
                                  fn={setHasCustomLeadEventName}
                                  checked={hasCustomLeadEventName}
                                  trackDimensions="w-8 h-4"
                                  thumbDimensions="w-3 h-3"
                                  thumbTranslate="translate-x-4"
                                />
                                <div className="flex flex-col gap-1">
                                  <h3 className="text-sm font-medium text-neutral-700">
                                    Set a custom lead event name
                                  </h3>
                                </div>
                              </div>

                              {hasCustomLeadEventName && (
                                <div className="p-px">
                                  <label
                                    htmlFor="leadEventName"
                                    className="block text-sm font-medium text-neutral-900"
                                  >
                                    Lead event name
                                  </label>
                                  <input
                                    id="leadEventName"
                                    type="text"
                                    className={cn(
                                      "mt-2 block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                                      errors.leadEventName &&
                                        "border-red-600 focus:border-red-500 focus:ring-red-600",
                                    )}
                                    {...register("leadEventName", {
                                      setValueAs: (value) =>
                                        value === "" ? null : value,
                                    })}
                                    placeholder="Sign up"
                                  />
                                </div>
                              )}
                            </div>
                          </AnimatedSizeContainer>
                        </>
                      ) : commissionType === "sale" ? (
                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <label
                              htmlFor="saleAmount"
                              className="flex items-center space-x-2"
                            >
                              <h2 className="text-sm font-medium text-neutral-900">
                                Sale amount
                              </h2>
                            </label>
                            <div className="relative mt-2 rounded-md shadow-sm">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                                $
                              </span>
                              <Controller
                                name="saleAmount"
                                control={control}
                                rules={{
                                  min: 0,
                                }}
                                render={({ field }) => (
                                  <input
                                    {...field}
                                    type="number"
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className={cn(
                                      "block w-full rounded-md border-neutral-300 pl-6 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                                      errors.saleAmount &&
                                        "border-red-600 focus:border-red-500 focus:ring-red-600",
                                    )}
                                    value={
                                      field.value == null || isNaN(field.value)
                                        ? ""
                                        : field.value
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      field.onChange(
                                        val === "" ? null : parseFloat(val),
                                      );
                                    }}
                                    placeholder="0.00"
                                  />
                                )}
                              />
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                                USD
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-4">
                              <Switch
                                fn={setHasSaleEventDate}
                                checked={hasSaleEventDate}
                                trackDimensions="w-8 h-4"
                                thumbDimensions="w-3 h-3"
                                thumbTranslate="translate-x-4"
                              />
                              <h3 className="text-sm font-medium text-neutral-700">
                                Add sale date
                              </h3>
                            </div>

                            {hasSaleEventDate && (
                              <div className="mt-4">
                                <SmartDateTimePicker
                                  value={saleEventDate}
                                  onChange={(date) => {
                                    setValue("saleEventDate", date, {
                                      shouldDirty: true,
                                    });
                                  }}
                                  label="Sale date"
                                  placeholder='E.g. "2024-03-01", "Last Thursday", "2 hours ago"'
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-4">
                              <Switch
                                fn={setHasInvoiceId}
                                checked={hasInvoiceId}
                                trackDimensions="w-8 h-4"
                                thumbDimensions="w-3 h-3"
                                thumbTranslate="translate-x-4"
                              />
                              <div className="flex gap-1">
                                <h3 className="text-sm font-medium text-neutral-700">
                                  Add{" "}
                                </h3>
                                <span className="rounded-md border border-neutral-200 bg-neutral-100 px-1 py-0.5 text-xs">
                                  invoiceID
                                </span>
                              </div>
                            </div>

                            {hasInvoiceId && (
                              <div className="mt-4">
                                <label
                                  htmlFor="invoiceId"
                                  className="flex items-center space-x-2"
                                >
                                  <h2 className="text-sm font-medium text-neutral-900">
                                    Invoice ID
                                  </h2>
                                </label>
                                <div className="mt-2 p-px">
                                  <input
                                    type="text"
                                    id="invoiceId"
                                    className={cn(
                                      "block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                                      errors.invoiceId &&
                                        "border-red-600 focus:border-red-500 focus:ring-red-600",
                                    )}
                                    {...register("invoiceId", {
                                      required: hasInvoiceId,
                                      setValueAs: (value) =>
                                        value === "" ? null : value,
                                    })}
                                    placeholder="Enter invoice ID"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-4">
                              <Switch
                                fn={setHasProductId}
                                checked={hasProductId}
                                trackDimensions="w-8 h-4"
                                thumbDimensions="w-3 h-3"
                                thumbTranslate="translate-x-4"
                              />
                              <div className="flex gap-1">
                                <h3 className="text-sm font-medium text-neutral-700">
                                  Add{" "}
                                </h3>
                                <span className="rounded-md border border-neutral-200 bg-neutral-100 px-1 py-0.5 text-xs">
                                  productID
                                </span>
                              </div>
                            </div>

                            {hasProductId && (
                              <div className="mt-4">
                                <label
                                  htmlFor="productId"
                                  className="flex items-center space-x-2"
                                >
                                  <h2 className="text-sm font-medium text-neutral-900">
                                    Product ID
                                  </h2>
                                </label>
                                <div className="mt-2 p-px">
                                  <input
                                    type="text"
                                    id="productId"
                                    className={cn(
                                      "block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                                      errors.productId &&
                                        "border-red-600 focus:border-red-500 focus:ring-red-600",
                                    )}
                                    {...register("productId", {
                                      required: hasProductId,
                                      setValueAs: (value) =>
                                        value === "" ? null : value,
                                    })}
                                    placeholder="Enter product ID"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null)}
                  </div>
                </ProgramSheetAccordionContent>
              </ProgramSheetAccordionItem>
            )}
          </ProgramSheetAccordion>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-end gap-2 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Cancel"
            className="w-fit"
            disabled={isPending}
          />

          <Button
            type="submit"
            variant="primary"
            text={`Create commission${stripeInvoices.length > 0 ? "s" : ""}`}
            className="w-fit"
            loading={isPending}
            disabledTooltip={submitDisabledMessage}
          />
        </div>
      </div>
    </form>
  );
}

export function CreateCommissionSheet({
  isOpen,
  nested,
  ...rest
}: CreateCommissionSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <CreateCommissionSheetContent {...rest} />
    </Sheet>
  );
}

export function useCreateCommissionSheet(
  props: { nested?: boolean } & Omit<CreateCommissionSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    createCommissionSheet: (
      <CreateCommissionSheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
