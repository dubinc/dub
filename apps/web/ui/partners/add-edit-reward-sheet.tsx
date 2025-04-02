"use client";

import { createRewardAction } from "@/lib/actions/partners/create-reward";
import { deleteRewardAction } from "@/lib/actions/partners/delete-reward";
import { updateRewardAction } from "@/lib/actions/partners/update-reward";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useRewardPartners from "@/lib/swr/use-reward-partners";
import useRewards from "@/lib/swr/use-rewards";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, RewardProps } from "@/lib/types";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import {
  COMMISSION_TYPES,
  createRewardSchema,
} from "@/lib/zod/schemas/rewards";
import { SelectEligiblePartnersSheet } from "@/ui/partners/select-eligible-partners-sheet";
import { X } from "@/ui/shared/icons";
import { EventType } from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  Button,
  CircleCheckFill,
  Sheet,
  Tooltip,
  usePagination,
} from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";
import { PartnersTable } from "./reward-discount-partners-table";

interface RewardSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  event: EventType;
  reward?: RewardProps;
}

type FormData = z.infer<typeof createRewardSchema>;

const PARTNER_TYPES = [
  {
    key: "all",
    label: "All Partners",
    description: "Everyone is eligible",
  },
  {
    key: "specific",
    label: "Specific Partners",
    description: "Select who is eligible",
  },
] as const;

function RewardSheetContent({ setIsOpen, event, reward }: RewardSheetProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const { rewards } = useRewards();
  const { id: workspaceId } = useWorkspace();
  const { program, mutate: mutateProgram } = useProgram();
  const [isAddPartnersOpen, setIsAddPartnersOpen] = useState(false);

  const [selectedPartnerType, setSelectedPartnerType] =
    useState<(typeof PARTNER_TYPES)[number]["key"]>("all");

  const [isRecurring, setIsRecurring] = useState(
    reward ? reward.maxDuration !== 0 : false,
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      event,
      type: reward?.type || "flat",
      maxDuration: reward
        ? reward.maxDuration === null
          ? Infinity
          : reward.maxDuration
        : 12,
      amount: reward?.type === "flat" ? reward.amount / 100 : reward?.amount,
      partnerIds: null,
    },
  });

  const [amount, type, partnerIds = []] = watch([
    "amount",
    "type",
    "partnerIds",
  ]);

  const hasProgramWideClickReward = rewards?.some(
    (reward) => reward.event === "click" && reward.partnersCount === 0,
  );

  const hasProgramWideLeadReward = rewards?.some(
    (reward) => reward.event === "lead" && reward.partnersCount === 0,
  );

  const hasProgramWideSaleReward = rewards?.some(
    (reward) => reward.event === "sale" && reward.partnersCount === 0,
  );

  useEffect(() => {
    if (reward) {
      setSelectedPartnerType(reward.partnersCount === 0 ? "all" : "specific");
    } else if (
      (event === "click" && hasProgramWideClickReward) ||
      (event === "lead" && hasProgramWideLeadReward) ||
      (event === "sale" && hasProgramWideSaleReward)
    ) {
      setSelectedPartnerType("specific");
    } else {
      setSelectedPartnerType("all");
    }
  }, [
    reward,
    event,
    hasProgramWideClickReward,
    hasProgramWideLeadReward,
    hasProgramWideSaleReward,
  ]);

  const { executeAsync: createReward, isPending: isCreating } = useAction(
    createRewardAction,
    {
      onSuccess: async () => {
        setIsOpen(false);
        toast.success("Reward created!");
        await mutateProgram();
        await mutatePrefix(`/api/programs/${program?.id}/rewards`);
      },
      onError({ error }) {
        toast.error(error.serverError);
        console.error(error);
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
        await mutatePrefix(`/api/programs/${program?.id}/rewards`);
      },
      onError({ error }) {
        toast.error(error.serverError);
        console.error(error);
      },
    },
  );

  const { executeAsync: deleteReward, isPending: isDeleting } = useAction(
    deleteRewardAction,
    {
      onSuccess: async () => {
        setIsOpen(false);
        toast.success("Reward deleted!");
        await mutate(`/api/programs/${program?.id}`);
        await mutatePrefix(`/api/programs/${program?.id}/rewards`);
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !program) {
      return;
    }

    const payload = {
      ...data,
      workspaceId,
      programId: program.id,
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
    if (!workspaceId || !program || !reward) {
      return;
    }

    if (!window.confirm("Are you sure you want to delete this reward?")) {
      return;
    }

    await deleteReward({
      workspaceId,
      programId: program.id,
      rewardId: reward.id,
    });
  };

  // Manage reward partners
  const { pagination, setPagination } = usePagination(25);
  const [selectedPartners, setSelectedPartners] =
    useState<EnrolledPartnerProps[]>();

  const { data: rewardPartners, loading: rewardPartnersLoading } =
    useRewardPartners({
      query: {
        rewardId: reward?.id,
        pageSize: pagination.pageSize,
        page: pagination.pageIndex || 1,
      },
      enabled: Boolean(reward && program),
    });

  useEffect(() => {
    if (rewardPartners) {
      setSelectedPartners(rewardPartners);
    }
  }, [rewardPartners]);

  useEffect(() => {
    if (selectedPartners) {
      setValue(
        "partnerIds",
        selectedPartners.map((partner) => partner.id),
      );
    }
  }, [selectedPartners, setValue]);

  const hasDefaultReward = !!program?.defaultRewardId;

  const buttonDisabled =
    isCreating ||
    isUpdating ||
    amount == null ||
    (selectedPartnerType === "specific" &&
      (!partnerIds || partnerIds.length === 0));

  const displayAddPartnerButton =
    (event === "sale" &&
      hasDefaultReward &&
      reward?.id !== program?.defaultRewardId) ||
    (event !== "sale" && selectedPartnerType === "specific");

  const canDeleteReward =
    (reward && program?.defaultRewardId !== reward.id) ||
    isCreating ||
    isUpdating;

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className="flex h-full flex-col"
      >
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            {reward ? "Edit" : "Create"}{" "}
            {!program?.defaultRewardId && event === "sale" ? "default" : ""}{" "}
            {event} reward
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
            {event !== "sale" && (
              <div>
                <label className="text-sm font-medium text-neutral-800">
                  {`Amount per ${event}`}
                </label>
                <div className="relative mt-2 rounded-md shadow-sm">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                    $
                  </span>
                  <input
                    className={cn(
                      "block w-full rounded-md border-neutral-300 pl-6 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                      errors.amount &&
                        "border-red-600 focus:border-red-500 focus:ring-red-600",
                    )}
                    {...register("amount", {
                      required: true,
                      valueAsNumber: true,
                      min: 0,
                      max: 1000,
                      onChange: handleMoneyInputChange,
                    })}
                    onKeyDown={handleMoneyKeyDown}
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                    USD
                  </span>
                </div>
              </div>
            )}

            {event !== "sale" && (
              <div className="mt-2">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {PARTNER_TYPES.map((partnerType) => {
                    const isSelected = selectedPartnerType === partnerType.key;

                    const isDisabled =
                      (partnerType.key === "all" &&
                        ((event === "click" && hasProgramWideClickReward) ||
                          (event === "lead" && hasProgramWideLeadReward))) ||
                      !!reward;

                    const tooltipContent = isDisabled
                      ? reward
                        ? "Partner type cannot be changed for existing rewards"
                        : `You can only have one program-wide ${event} reward.`
                      : undefined;

                    const labelContent = (
                      <label
                        key={partnerType.label}
                        className={cn(
                          "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                          "transition-all duration-150",
                          isSelected &&
                            "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                          (isDisabled || !!reward) &&
                            "cursor-not-allowed opacity-60 hover:bg-white",
                        )}
                      >
                        <input
                          type="radio"
                          value={partnerType.label}
                          className="hidden"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPartnerType(partnerType.key);

                              if (partnerType.key === "all") {
                                setValue("partnerIds", null);
                              }
                            }
                          }}
                        />
                        <div className="flex grow flex-col text-sm">
                          <span className="font-medium">
                            {partnerType.label}
                          </span>
                          <span>{partnerType.description}</span>
                        </div>
                        <CircleCheckFill
                          className={cn(
                            "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                            isSelected && "scale-100 opacity-100",
                          )}
                        />
                      </label>
                    );

                    return isDisabled ? (
                      <Tooltip key={partnerType.label} content={tooltipContent}>
                        {labelContent}
                      </Tooltip>
                    ) : (
                      labelContent
                    );
                  })}
                </div>
              </div>
            )}

            {event === "sale" && (
              <>
                <div>
                  <label className="text-sm font-medium text-neutral-800">
                    Commission
                  </label>
                  <p className="mb-4 text-sm text-neutral-600">
                    Set how the affiliate will get rewarded
                  </p>
                  <div className="-m-1">
                    <AnimatedSizeContainer
                      height
                      transition={{ ease: "easeInOut", duration: 0.2 }}
                    >
                      <div className="p-1">
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          {COMMISSION_TYPES.map(
                            ({ label, description, value }) => {
                              const isSelected =
                                (value === "recurring") === isRecurring;

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
                                        setIsRecurring(value === "recurring");
                                        setValue(
                                          "maxDuration",
                                          value === "recurring"
                                            ? reward?.maxDuration || 12
                                            : 0,
                                        );
                                      }
                                    }}
                                  />
                                  <div className="flex grow flex-col text-sm">
                                    <span className="font-medium">{label}</span>
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
                            isRecurring ? "h-auto" : "h-0 opacity-0",
                          )}
                          aria-hidden={!isRecurring}
                          {...{
                            inert: !isRecurring,
                          }}
                        >
                          <div className="pt-6">
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

                <div className="mt-6">
                  <label className="text-sm font-medium text-neutral-800">
                    Payout
                  </label>
                  <p className="mb-4 text-sm text-neutral-600">
                    Set how much the affiliate will get rewarded
                  </p>
                  <div className="flex flex-col gap-6">
                    <div>
                      <label
                        htmlFor="type"
                        className="text-sm font-medium text-neutral-800"
                      >
                        Payout model
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

                    <div>
                      <label
                        htmlFor="amount"
                        className="text-sm font-medium text-neutral-800"
                      >
                        Amount
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
                            max: type === "flat" ? 1000 : 100,
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
                </div>
              </>
            )}

            {displayAddPartnerButton && (
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-neutral-800">
                    Eligible partners
                  </label>
                  <Button
                    text="Add partner"
                    className="h-7 w-fit"
                    onClick={() => setIsAddPartnersOpen(true)}
                  />
                </div>
                <div className="mt-4">
                  <PartnersTable
                    selectedPartners={selectedPartners || []}
                    setSelectedPartners={setSelectedPartners}
                    loading={rewardPartnersLoading}
                    pagination={pagination}
                    setPagination={setPagination}
                  />
                </div>
              </div>
            )}
          </div>
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
                disabled={!canDeleteReward}
                disabledTooltip={
                  program?.defaultRewardId === reward.id
                    ? "This is a default reward and cannot be deleted."
                    : undefined
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
              disabled={buttonDisabled || isDeleting}
              disabledTooltip={
                selectedPartnerType === "specific" &&
                (!partnerIds || partnerIds.length === 0)
                  ? "Please select at least one partner"
                  : undefined
              }
            />
          </div>
        </div>
      </form>

      <SelectEligiblePartnersSheet
        isOpen={isAddPartnersOpen}
        setIsOpen={setIsAddPartnersOpen}
        existingPartners={selectedPartners || []}
        onSelect={setSelectedPartners}
      />
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
