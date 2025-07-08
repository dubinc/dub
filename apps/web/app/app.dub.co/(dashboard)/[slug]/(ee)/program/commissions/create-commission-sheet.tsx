import { createCommissionAction } from "@/lib/actions/partners/create-commission";
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
import {
  AnimatedSizeContainer,
  Button,
  Sheet,
  SmartDateTimePicker,
  Switch,
  ToggleGroup,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { CommissionType } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface CreateCommissionSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  partnerId?: string;
}

type FormData = z.infer<typeof createCommissionSchema>;

function CreateCommissionSheetContent(props: CreateCommissionSheetProps) {
  const { setIsOpen, partnerId: initialPartnerId } = props;

  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const [hasInvoiceId, setHasInvoiceId] = useState(false);
  const { rewards, loading: rewardsLoading } = useRewards();
  const [hasCustomLeadEventDate, setHasCustomLeadEventDate] = useState(false);
  const [hasCustomLeadEventName, setHasCustomLeadEventName] = useState(false);

  const [commissionType, setCommissionType] =
    useState<CommissionType>("custom");

  const [openAccordions, setOpenAccordions] = useState<string[]>([
    "partner-and-type",
  ]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    control,
  } = useForm<FormData>({
    defaultValues: {
      partnerId: initialPartnerId,
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
  ] = watch([
    "partnerId",
    "date",
    "amount",
    "linkId",
    "customerId",
    "saleEventDate",
    "saleAmount",
    "leadEventDate",
  ]);

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
    const baseValues = ["partner-and-type"];

    if (commissionType === "custom") {
      setOpenAccordions([...baseValues, "commission"]);
    } else if (commissionType === "sale") {
      setOpenAccordions([...baseValues, "customer", "sale"]);
    } else if (commissionType === "lead") {
      setOpenAccordions([...baseValues, "customer"]);
    }
  }, [commissionType]);

  const { executeAsync, isPending } = useAction(createCommissionAction, {
    onSuccess: async () => {
      toast.success("A commission has been created for the partner!");
      setIsOpen(false);
      await mutatePrefix(`/api/commissions?workspaceId=${workspaceId}`);
    },
    onError({ error }) {
      console.log(error);
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
      workspaceId,
      date,
      amount: data.amount ? data.amount * 100 : null,
      saleAmount: data.saleAmount ? data.saleAmount * 100 : null,
      saleEventDate,
      leadEventDate,
    });
  };

  const rewardEventTypes = useMemo(() => {
    return rewards?.map((reward) => reward.event);
  }, [rewards]);

  const shouldDisableSubmit = useMemo(() => {
    if (!partnerId) {
      return true;
    }

    if (commissionType === "custom") {
      return !amount;
    }

    if (commissionType === "sale") {
      return !linkId || !customerId || !saleAmount;
    }

    if (commissionType === "lead") {
      return !linkId || !customerId;
    }

    return false;
  }, [commissionType, partnerId, linkId, customerId, saleAmount, amount]);

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
            onValueChange={setOpenAccordions}
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
                    {!rewardsLoading ? (
                      <ToggleGroup
                        className="mt-2 flex w-full items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-1"
                        optionClassName="h-8 flex items-center justify-center rounded-md flex-1  text-sm"
                        indicatorClassName="bg-white"
                        options={[
                          { value: "custom", label: "One-time" },
                          ...(rewardEventTypes?.includes("sale")
                            ? [{ value: "sale", label: "Sale" }]
                            : []),
                          ...(rewardEventTypes?.includes("lead")
                            ? [{ value: "lead", label: "Lead" }]
                            : []),
                        ]}
                        selected={commissionType}
                        selectAction={(id: CommissionType) =>
                          setCommissionType(id)
                        }
                      />
                    ) : (
                      <div className="flex w-full items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-1">
                        <div className="h-8 flex-1 animate-pulse rounded-md bg-neutral-200" />
                        <div className="h-8 flex-1 animate-pulse rounded-md bg-neutral-200" />
                      </div>
                    )}
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
                      <SmartDateTimePicker
                        value={date}
                        onChange={(date) => {
                          setValue("date", date, {
                            shouldDirty: true,
                          });
                        }}
                        label="Date"
                        placeholder='E.g. "2024-03-01", "Last Thursday", "2 hours ago"'
                      />
                    </div>

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
                  </div>
                </ProgramSheetAccordionContent>
              </ProgramSheetAccordionItem>
            )}

            {(commissionType === "sale" || commissionType === "lead") && (
              <ProgramSheetAccordionItem value="customer">
                <ProgramSheetAccordionTrigger>
                  Customer
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
                    )}

                    {customerId && (
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
                              <input
                                type="text"
                                className={cn(
                                  "block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                                  errors.leadEventName &&
                                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                                )}
                                {...register("leadEventName", {
                                  setValueAs: (value) =>
                                    value === "" ? null : value,
                                })}
                                placeholder="Enter lead event name"
                              />
                            </div>
                          )}
                        </div>
                      </AnimatedSizeContainer>
                    )}
                  </div>
                </ProgramSheetAccordionContent>
              </ProgramSheetAccordionItem>
            )}

            {commissionType === "sale" && (
              <ProgramSheetAccordionItem value="sale">
                <ProgramSheetAccordionTrigger>
                  Sale
                </ProgramSheetAccordionTrigger>
                <ProgramSheetAccordionContent>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
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

                    <AnimatedSizeContainer
                      height
                      transition={{ ease: "easeInOut", duration: 0.2 }}
                      className={!hasInvoiceId ? "hidden" : ""}
                      style={{ display: !hasInvoiceId ? "none" : "block" }}
                    >
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
                    </AnimatedSizeContainer>
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
            text="Create commission"
            className="w-fit"
            loading={isPending}
            disabled={shouldDisableSubmit}
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
