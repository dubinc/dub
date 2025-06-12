import { createCommissionAction } from "@/lib/actions/partners/create-commission";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
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
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface CreateCommissionSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

type FormData = z.infer<typeof createCommissionSchema>;

type CommissionType = "one-time" | "sale" | "lead";

function CreateCommissionSheetContent({
  setIsOpen,
}: CreateCommissionSheetProps) {
  const { program } = useProgram();
  const { id: workspaceId } = useWorkspace();
  const [hasInvoiceId, setHasInvoiceId] = useState(false);
  const { rewards, loading: rewardsLoading } = useRewards();
  const [hasCustomLeadEventDate, setHasCustomLeadEventDate] = useState(false);
  const [hasCustomLeadEventName, setHasCustomLeadEventName] = useState(false);
  const [commissionType, setCommissionType] =
    useState<CommissionType>("one-time");
  const [openAccordions, setOpenAccordions] = useState<string[]>([
    "partner-and-type",
  ]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>();

  const [partnerId, linkId, customerId, saleEventDate, leadEventDate] = watch([
    "partnerId",
    "linkId",
    "customerId",
    "saleEventDate",
    "leadEventDate",
  ]);

  useEffect(() => {
    if (commissionType === "one-time") {
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

    if (commissionType === "one-time") {
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
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !program) {
      toast.error("Please fill all required fields.");
      return;
    }

    const saleEventDate = data.saleEventDate
      ? new Date(data.saleEventDate).toISOString()
      : null;

    const leadEventDate = data.leadEventDate
      ? new Date(data.leadEventDate).toISOString()
      : null;

    await executeAsync({
      ...data,
      workspaceId,
      saleAmount: data.saleAmount ? data.saleAmount * 100 : null,
      saleEventDate,
      leadEventDate,
    });
  };

  const rewardEventTypes = useMemo(() => {
    return rewards?.map((reward) => reward.event);
  }, [rewards]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex items-start justify-between p-6">
          <Sheet.Title className="text-xl font-semibold">
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
                Partner and type
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

                  <div className="flex w-full items-center">
                    {!rewardsLoading ? (
                      <ToggleGroup
                        className="flex w-full items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-1"
                        optionClassName="h-8 flex items-center justify-center rounded-md flex-1  text-sm"
                        indicatorClassName="bg-white"
                        options={[
                          { value: "one-time", label: "One-time" },
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

                  {commissionType === "one-time" && (
                    <AnimatedSizeContainer
                      height
                      transition={{ ease: "easeInOut", duration: 0.2 }}
                      style={{
                        height: "auto",
                        overflow: "hidden",
                      }}
                    >
                      <div className="py-1 text-center text-base font-medium leading-6 text-neutral-500">
                        Send a one-time commission
                      </div>
                    </AnimatedSizeContainer>
                  )}

                  {commissionType !== "one-time" && (
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
                        <div className="mt-2">
                          <PartnerLinkSelector
                            selectedLinkId={linkId ?? null}
                            showDestinationUrl={false}
                            partnerId={partnerId}
                            setSelectedLinkId={(id) =>
                              setValue("linkId", id, { shouldDirty: true })
                            }
                          />
                        </div>
                      </div>
                    </AnimatedSizeContainer>
                  )}
                </div>
              </ProgramSheetAccordionContent>
            </ProgramSheetAccordionItem>

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
                          selectedCustomerId={customerId}
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
                        <input
                          className={cn(
                            "block w-full rounded-md border-neutral-300 pl-6 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                            errors.saleAmount &&
                              "border-red-600 focus:border-red-500 focus:ring-red-600",
                          )}
                          {...register("saleAmount", {
                            valueAsNumber: true,
                            min: 0,
                            onChange: handleMoneyInputChange,
                            setValueAs: (value) =>
                              value === "" ? null : value,
                          })}
                          placeholder="0.00"
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

            {commissionType === "one-time" && (
              <ProgramSheetAccordionItem value="commission">
                <ProgramSheetAccordionTrigger>
                  Commission
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
                        <input
                          className={cn(
                            "block w-full rounded-md border-neutral-300 pl-6 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                            errors.saleAmount &&
                              "border-red-600 focus:border-red-500 focus:ring-red-600",
                          )}
                          {...register("saleAmount", {
                            required: true,
                            valueAsNumber: true,
                            min: 0,
                            max: 1000,
                            onChange: handleMoneyInputChange,
                          })}
                          onKeyDown={handleMoneyKeyDown}
                          placeholder="0.00"
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
            disabled={!partnerId || !linkId || !customerId}
          />
        </div>
      </div>
    </form>
  );
}

export function CreateCommissionSheet({
  isOpen,
  ...rest
}: CreateCommissionSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <CreateCommissionSheetContent {...rest} />
    </Sheet>
  );
}

export function useCreateCommissionSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    createCommissionSheet: (
      <CreateCommissionSheet setIsOpen={setIsOpen} isOpen={isOpen} />
    ),
    setIsOpen,
  };
}
