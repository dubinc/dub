"use client";

import { createRewardAction } from "@/lib/actions/partners/create-reward";
import { deleteRewardAction } from "@/lib/actions/partners/delete-reward";
import { updateRewardAction } from "@/lib/actions/partners/update-reward";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useRewardPartners from "@/lib/swr/use-reward-partners";
import useWorkspace from "@/lib/swr/use-workspace";
import { RewardProps } from "@/lib/types";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import {
  COMMISSION_TYPES,
  createRewardSchema,
  REWARD_EVENT_COLUMN_MAPPING,
} from "@/lib/zod/schemas/rewards";
import { X } from "@/ui/shared/icons";
import { EventType } from "@dub/prisma/client";
import { AnimatedSizeContainer, Button, CircleCheckFill, Sheet } from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";
import {
  ProgramSheetAccordion,
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "./program-sheet-accordion";
import { RewardPartnersTable } from "./reward-partners-table";

interface RewardSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  event: EventType;
  reward?: RewardProps;
  isDefault?: boolean;
}

type FormData = z.infer<typeof createRewardSchema>;

function RewardSheetContent({
  setIsOpen,
  event,
  reward,
  isDefault,
}: RewardSheetProps) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const formRef = useRef<HTMLFormElement>(null);
  const { mutate: mutateProgram } = useProgram();

  const [commissionStructure, setCommissionStructure] = useState<
    "one-off" | "recurring"
  >("recurring");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      event,
      type: reward?.type || (event === "sale" ? "percentage" : "flat"),
      maxDuration: reward
        ? reward.maxDuration === null
          ? Infinity
          : reward.maxDuration
        : Infinity,
      amount: reward?.type === "flat" ? reward.amount / 100 : reward?.amount,
      isDefault: isDefault || false,
      includedPartnerIds: null,
      excludedPartnerIds: null,
    },
  });

  useEffect(() => {
    if (reward) {
      setCommissionStructure(
        reward.maxDuration === 0 ? "one-off" : "recurring",
      );
    }
  }, [reward]);

  const [amount, type, includedPartnerIds = [], excludedPartnerIds = []] =
    watch(["amount", "type", "includedPartnerIds", "excludedPartnerIds"]);

  const selectedEvent = watch("event");

  const { data: rewardPartners, loading: isLoadingRewardPartners } =
    useRewardPartners({
      query: {
        rewardId: reward?.id,
      },
      enabled: Boolean(reward?.id && defaultProgramId),
    });

  useEffect(() => {
    if (rewardPartners && rewardPartners.length > 0) {
      setValue(
        isDefault ? "excludedPartnerIds" : "includedPartnerIds",
        rewardPartners.map((partner) => partner.id),
      );
    }
  }, [rewardPartners, setValue]);

  const { executeAsync: createReward, isPending: isCreating } = useAction(
    createRewardAction,
    {
      onSuccess: async () => {
        setIsOpen(false);
        toast.success("Reward created!");
        await mutateProgram();
        await mutatePrefix(`/api/programs/${defaultProgramId}/rewards`);
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const { executeAsync: updateReward, isPending: isUpdating } = useAction(
    updateRewardAction,
    {
      onSuccess: async () => {
        setIsOpen(false);
        toast.success("Reward updated!");
        await mutateProgram();
        await mutatePrefix([
          `/api/programs/${defaultProgramId}/rewards`,
          `/api/partners/count?groupBy=${REWARD_EVENT_COLUMN_MAPPING[event]}&workspaceId=${workspaceId}`,
        ]);
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const { executeAsync: deleteReward, isPending: isDeleting } = useAction(
    deleteRewardAction,
    {
      onSuccess: async () => {
        setIsOpen(false);
        toast.success("Reward deleted!");
        await mutate(`/api/programs/${defaultProgramId}`);
        await mutatePrefix(`/api/programs/${defaultProgramId}/rewards`);
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !defaultProgramId) {
      return;
    }

    const payload = {
      ...data,
      workspaceId,
      includedPartnerIds: isDefault ? null : includedPartnerIds,
      excludedPartnerIds: isDefault ? excludedPartnerIds : null,
      amount: type === "flat" ? data.amount * 100 : data.amount,
      maxDuration:
        Infinity === Number(data.maxDuration) ? null : data.maxDuration,
    };

    if (!reward) {
      await createReward(payload);
    } else {
      await updateReward({
        ...payload,
        rewardId: reward.id,
      });
    }
  };

  const onDelete = async () => {
    if (!workspaceId || !defaultProgramId || !reward) {
      return;
    }

    if (!window.confirm("Are you sure you want to delete this reward?")) {
      return;
    }

    await deleteReward({
      workspaceId,
      rewardId: reward.id,
    });
  };

  const [accordionValues, setAccordionValues] = useState<string[]>([
    "reward-type",
    "commission-structure",
    "reward-details",
  ]);

  useEffect(() => {
    // Only include partner-eligibility if:
    // 1. New non-default reward, OR
    // 2. Existing reward that has rewardPartners (either included or excluded)
    if (
      (!reward && !isDefault) ||
      (rewardPartners && rewardPartners.length > 0)
    ) {
      setAccordionValues((prev) => [...prev, "partner-eligibility"]);
    }
  }, [rewardPartners, reward, isDefault]);

  const canDeleteReward = reward && !reward.default;

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className="flex h-full flex-col"
      >
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            {reward ? "Edit" : "Create"} {isDefault ? "default" : ""}{" "}
            {selectedEvent} reward
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <ProgramSheetAccordion
            type="multiple"
            value={accordionValues}
            onValueChange={setAccordionValues}
          >
            {selectedEvent === "sale" && (
              <ProgramSheetAccordionItem value="commission-structure">
                <ProgramSheetAccordionTrigger>
                  Commission Structure
                </ProgramSheetAccordionTrigger>
                <ProgramSheetAccordionContent>
                  <div className="space-y-4">
                    <p className="text-sm text-neutral-600">
                      Set how the affiliate will get rewarded
                    </p>
                    <div className="-m-1">
                      <AnimatedSizeContainer
                        height
                        transition={{ ease: "easeInOut", duration: 0.2 }}
                      >
                        <div className="flex flex-col gap-4 p-1">
                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {COMMISSION_TYPES.map(
                              ({ label, description, value }) => {
                                const isSelected =
                                  value === commissionStructure;

                                return (
                                  <label
                                    key={label}
                                    className={cn(
                                      "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                                      "transition-all duration-150",
                                      isSelected &&
                                        "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                                    )}
                                  >
                                    <input
                                      type="radio"
                                      value={value}
                                      className="hidden"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setCommissionStructure(value);
                                          setValue(
                                            "maxDuration",
                                            value === "recurring"
                                              ? reward?.maxDuration || Infinity
                                              : 0,
                                          );
                                        }
                                      }}
                                    />
                                    <div className="flex grow flex-col text-sm">
                                      <span className="font-medium">
                                        {label}
                                      </span>
                                      <span>{description}</span>
                                    </div>
                                    <CircleCheckFill
                                      className={cn(
                                        "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                                        isSelected && "scale-100 opacity-100",
                                      )}
                                    />
                                  </label>
                                );
                              },
                            )}
                          </div>

                          <div
                            className={cn(
                              "transition-opacity duration-200",
                              commissionStructure === "recurring"
                                ? "h-auto"
                                : "h-0 opacity-0",
                            )}
                            aria-hidden={commissionStructure !== "recurring"}
                            {...{
                              inert: commissionStructure !== "recurring",
                            }}
                          >
                            <div>
                              <label
                                htmlFor="duration"
                                className="text-sm font-medium text-neutral-800"
                              >
                                Duration
                              </label>
                              <div className="relative mt-2 rounded-md shadow-sm">
                                <select
                                  className="block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                                  {...register("maxDuration", {
                                    valueAsNumber: true,
                                  })}
                                >
                                  {RECURRING_MAX_DURATIONS.filter(
                                    (v) => v !== 0,
                                  ).map((v) => (
                                    <option value={v} key={v}>
                                      {v} {pluralize("month", Number(v))}
                                    </option>
                                  ))}
                                  <option value={Infinity}>Lifetime</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AnimatedSizeContainer>
                    </div>
                  </div>
                </ProgramSheetAccordionContent>
              </ProgramSheetAccordionItem>
            )}

            <ProgramSheetAccordionItem value="reward-details">
              <ProgramSheetAccordionTrigger>
                Reward Details
              </ProgramSheetAccordionTrigger>
              <ProgramSheetAccordionContent>
                <div className="space-y-4">
                  <p className="text-sm text-neutral-600">
                    Set how much the affiliate will get rewarded
                  </p>

                  {selectedEvent === "sale" && (
                    <div>
                      <label
                        htmlFor="type"
                        className="text-sm font-medium text-neutral-800"
                      >
                        Reward structure
                      </label>
                      <div className="relative mt-2 rounded-md shadow-sm">
                        <select
                          className="block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                          {...register("type", { required: true })}
                        >
                          <option value="flat">Flat</option>
                          <option value="percentage">Percentage</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="amount"
                      className="text-sm font-medium text-neutral-800"
                    >
                      Reward amount{" "}
                      {selectedEvent !== "sale" ? `per ${selectedEvent}` : ""}
                    </label>
                    <div className="relative mt-2 rounded-md shadow-sm">
                      {type === "flat" && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                          $
                        </span>
                      )}
                      <input
                        className={cn(
                          "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                          errors.amount &&
                            "border-red-600 focus:border-red-500 focus:ring-red-600",
                          type === "flat" ? "pl-6 pr-12" : "pr-7",
                        )}
                        {...register("amount", {
                          required: true,
                          valueAsNumber: true,
                          min: 0,
                          max: type === "percentage" ? 100 : undefined,
                          onChange: handleMoneyInputChange,
                        })}
                        onKeyDown={handleMoneyKeyDown}
                      />
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                        {type === "flat" ? "USD" : "%"}
                      </span>
                    </div>
                  </div>
                </div>
              </ProgramSheetAccordionContent>
            </ProgramSheetAccordionItem>

            <ProgramSheetAccordionItem value="partner-eligibility">
              <ProgramSheetAccordionTrigger>
                Partner Eligibility
              </ProgramSheetAccordionTrigger>
              <ProgramSheetAccordionContent>
                <div className="space-y-4">
                  <RewardPartnersTable
                    event={selectedEvent}
                    rewardId={reward?.id}
                    partnerIds={
                      (isDefault ? excludedPartnerIds : includedPartnerIds) ||
                      []
                    }
                    setPartnerIds={(value: string[]) => {
                      if (isDefault) {
                        setValue("excludedPartnerIds", value);
                      } else {
                        setValue("includedPartnerIds", value);
                      }
                    }}
                    rewardPartners={rewardPartners || []}
                    loading={isLoadingRewardPartners}
                    mode={isDefault ? "exclude" : "include"}
                  />
                </div>
              </ProgramSheetAccordionContent>
            </ProgramSheetAccordionItem>
          </ProgramSheetAccordion>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 p-5">
          <div>
            {reward && (
              <Button
                type="button"
                variant="outline"
                text="Remove reward"
                onClick={onDelete}
                loading={isDeleting}
                disabled={!canDeleteReward || isCreating || isUpdating}
                disabledTooltip={
                  canDeleteReward
                    ? undefined
                    : "This is a default reward and cannot be deleted."
                }
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              text="Cancel"
              className="w-fit"
              disabled={isCreating || isUpdating || isDeleting}
            />

            <Button
              type="submit"
              variant="primary"
              text={reward ? "Update reward" : "Create reward"}
              className="w-fit"
              loading={isCreating || isUpdating}
              disabled={
                amount == null || isDeleting || isCreating || isUpdating
              }
            />
          </div>
        </div>
      </form>
    </>
  );
}

export function RewardSheet({
  isOpen,
  nested,
  ...rest
}: RewardSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <RewardSheetContent {...rest} />
    </Sheet>
  );
}

export function useRewardSheet(
  props: { nested?: boolean } & Omit<RewardSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    RewardSheet: (
      <RewardSheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
