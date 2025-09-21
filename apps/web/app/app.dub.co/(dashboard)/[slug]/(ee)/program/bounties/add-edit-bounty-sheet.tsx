import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  BountyExtendedProps,
  BountyProps,
  BountySubmissionRequirement,
} from "@/lib/types";
import { createBountySchema } from "@/lib/zod/schemas/bounties";
import { workflowConditionSchema } from "@/lib/zod/schemas/workflows";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { BountyLogic } from "@/ui/partners/bounties/bounty-logic";
import { GroupsMultiSelect } from "@/ui/partners/groups/groups-multi-select";
import {
  ProgramSheetAccordion,
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { AmountInput } from "@/ui/shared/amount-input";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  CardSelector,
  CardSelectorOption,
  Sheet,
  SmartDateTimePicker,
  Switch,
  ToggleGroup,
  useRouterStuff,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type BountySheetProps = {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  bounty?: BountyExtendedProps;
};

type FormData = z.infer<typeof createBountySchema>;

export const useAddEditBountyForm = () => useFormContext<FormData>();

const BOUNTY_TYPES: CardSelectorOption[] = [
  {
    key: "performance",
    label: "Performance-based",
    description: "Reward for reaching milestones",
  },
  {
    key: "submission",
    label: "Submission",
    description: "Reward for task completion",
  },
];

// Only valid for submission bounties
const REWARD_TYPES = [
  {
    value: "flat",
    label: "Flat rate",
  },
  {
    value: "custom",
    label: "Custom",
  },
];

const ACCORDION_ITEMS = [
  "bounty-type",
  "bounty-details",
  "submission-requirements",
  "groups",
];

type RewardType = "flat" | "custom";

function BountySheetContent({ setIsOpen, bounty }: BountySheetProps) {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();
  const [hasEndDate, setHasEndDate] = useState(!!bounty?.endsAt);

  const [requireImage, setRequireImage] = useState(
    bounty?.submissionRequirements?.includes("image") || false,
  );

  const [requireUrl, setRequireUrl] = useState(
    bounty?.submissionRequirements?.includes("url") || false,
  );

  const [rewardType, setRewardType] = useState<RewardType>(
    bounty ? (bounty.rewardAmount ? "flat" : "custom") : "flat",
  );

  const [openAccordions, setOpenAccordions] = useState(ACCORDION_ITEMS);
  const { makeRequest, isSubmitting } = useApiMutation<BountyProps>();

  const form = useForm<FormData>({
    defaultValues: {
      name: bounty?.name || undefined,
      description: bounty?.description || undefined,
      startsAt: bounty?.startsAt || undefined,
      endsAt: bounty?.endsAt || undefined,
      rewardAmount: bounty?.rewardAmount
        ? bounty.rewardAmount / 100
        : undefined,
      rewardDescription: bounty?.rewardDescription || undefined,
      type: bounty?.type || "performance",
      submissionRequirements: bounty?.submissionRequirements || null,
      groupIds: bounty?.groups?.map(({ id }) => id) || null,
      performanceCondition: bounty?.performanceCondition
        ? {
            ...bounty.performanceCondition,
            value: isCurrencyAttribute(bounty.performanceCondition.attribute)
              ? bounty.performanceCondition.value / 100
              : bounty.performanceCondition.value,
          }
        : {
            operator: "gte",
          },
      performanceScope: bounty?.performanceScope ?? "new",
    },
  });

  const {
    handleSubmit,
    watch,
    setValue,
    control,
    register,
    formState: { errors },
  } = form;

  const [
    startsAt,
    endsAt,
    rewardAmount,
    rewardDescription,
    type,
    name,
    description,
    performanceCondition,
  ] = watch([
    "startsAt",
    "endsAt",
    "rewardAmount",
    "rewardDescription",
    "type",
    "name",
    "description",
    "performanceCondition",
  ]);

  // Make sure endsAt is null if hasEndDate is false
  useEffect(() => {
    if (!hasEndDate) {
      setValue("endsAt", null);
    }
  }, [hasEndDate, setValue]);

  // Set submission requirements
  useEffect(() => {
    const requirements: BountySubmissionRequirement[] = [];

    if (requireImage) {
      requirements.push("image");
    }

    if (requireUrl) {
      requirements.push("url");
    }

    if (requirements.length > 0) {
      setValue("submissionRequirements", requirements);
    } else {
      setValue("submissionRequirements", null);
    }
  }, [requireImage, requireUrl, setValue]);

  // Confirmation modal for bounty creation only
  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Confirm bounty creation",
    description:
      "This will create the bounty and notify all partners in the selected partner groups. Are you sure you want to continue?",
    confirmText: "Confirm",
    onConfirm: async () => {
      await performSubmit();
    },
  });

  // Decide if the submit button should be disabled
  const shouldDisableSubmit = useMemo(() => {
    if (!startsAt) {
      return true;
    }

    if (endsAt && endsAt <= startsAt) {
      return true;
    }

    if (type === "submission") {
      if (!name?.trim()) {
        return true;
      }

      if (rewardType === "flat" && !rewardAmount) {
        return true;
      }

      if (rewardType === "custom" && !rewardDescription) {
        return true;
      }
    }

    if (type === "performance") {
      if (
        ["attribute", "operator", "value"].some(
          (key) => performanceCondition?.[key] === undefined,
        )
      ) {
        return true;
      }

      if (!rewardAmount) {
        return true;
      }
    }

    return false;
  }, [
    startsAt,
    endsAt,
    rewardAmount,
    rewardDescription,
    rewardType,
    type,
    name,
    performanceCondition?.attribute,
    performanceCondition?.operator,
    performanceCondition?.value,
  ]);

  // Handle actual form submission (called after confirmation)
  const performSubmit = async () => {
    if (!workspaceId) return;

    const data = form.getValues();

    data.rewardAmount = data.rewardAmount ? data.rewardAmount * 100 : null;

    // Parse performance logic
    if (data.type === "performance") {
      const result = workflowConditionSchema.safeParse(
        data.performanceCondition,
      );

      if (!result.success) {
        toast.error(
          "Invalid performance logic. Please fix the errors and try again.",
        );
        return;
      }

      let { data: condition } = result;

      // Format the value to be in cents if it's a currency attribute
      condition = {
        ...condition,
        value: isCurrencyAttribute(condition.attribute)
          ? condition.value * 100
          : condition.value,
      };

      data.performanceCondition = condition;
      data.rewardDescription = null;
    } else if (type === "submission") {
      data.performanceCondition = null;

      if (rewardType === "custom") {
        data.rewardAmount = null;
      } else if (rewardType === "flat") {
        data.rewardDescription = null;
      }
    }

    await makeRequest(bounty ? `/api/bounties/${bounty.id}` : "/api/bounties", {
      method: bounty ? "PATCH" : "POST",
      body: data,
      onSuccess: () => {
        mutatePrefix("/api/bounties");
        setIsOpen(false);
        toast.success(`Bounty ${bounty ? "updated" : "created"} successfully!`);
      },
    });
  };

  // Handle form submission (shows confirmation modal for creation only)
  const onSubmit = handleSubmit(async (data: FormData) => {
    if (bounty) {
      // For updates, submit directly without confirmation
      await performSubmit();
    } else {
      // For creation, show confirmation modal
      setShowConfirmModal(true);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            {bounty ? "Update" : "Create"} bounty
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

      <FormProvider {...form}>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <ProgramSheetAccordion
              type="multiple"
              value={openAccordions}
              onValueChange={setOpenAccordions}
              className="space-y-6"
            >
              {!bounty && ( // cannot change type for existing bounties
                <ProgramSheetAccordionItem value="bounty-type">
                  <ProgramSheetAccordionTrigger>
                    Bounty type
                  </ProgramSheetAccordionTrigger>
                  <ProgramSheetAccordionContent>
                    <div className="space-y-4">
                      <p className="text-content-default text-sm">
                        Set how the bounty will be completed
                      </p>
                      <CardSelector
                        options={BOUNTY_TYPES}
                        value={watch("type")}
                        onChange={(value: FormData["type"]) =>
                          setValue("type", value)
                        }
                        name="bounty-type"
                      />
                    </div>
                  </ProgramSheetAccordionContent>
                </ProgramSheetAccordionItem>
              )}

              <ProgramSheetAccordionItem value="bounty-details">
                <ProgramSheetAccordionTrigger>
                  Bounty details
                </ProgramSheetAccordionTrigger>
                <ProgramSheetAccordionContent>
                  <div className="space-y-6">
                    <p className="text-content-default text-sm">
                      Set the schedule, reward, and additional details. Partners
                      who already met the goal before the start date will
                      auto-qualify and be rewarded.
                    </p>

                    <div>
                      <Controller
                        control={control}
                        name="startsAt"
                        render={({ field }) => (
                          <SmartDateTimePicker
                            value={field.value}
                            onChange={(date) =>
                              field.onChange(date ?? undefined)
                            }
                            label="Start date"
                            placeholder='E.g. "2024-03-01", "Last Thursday", "2 hours ago"'
                          />
                        )}
                      />
                      {errors.startsAt && "test"}
                    </div>

                    <AnimatedSizeContainer
                      height
                      transition={{ ease: "easeInOut", duration: 0.2 }}
                      className={!hasEndDate ? "hidden" : ""}
                      style={{ display: !hasEndDate ? "none" : "block" }}
                    >
                      <div className="flex items-center gap-4">
                        <Switch
                          fn={setHasEndDate}
                          checked={hasEndDate}
                          trackDimensions="w-8 h-4"
                          thumbDimensions="w-3 h-3"
                          thumbTranslate="translate-x-4"
                        />
                        <div className="flex flex-col gap-1">
                          <h3 className="text-sm font-medium text-neutral-700">
                            Add end date
                          </h3>
                        </div>
                      </div>

                      {hasEndDate && (
                        <div className="mt-6 p-px">
                          <Controller
                            control={control}
                            name="endsAt"
                            render={({ field }) => (
                              <SmartDateTimePicker
                                value={field.value}
                                onChange={(date) =>
                                  field.onChange(date ?? undefined)
                                }
                                label="End date"
                                placeholder='E.g. "in 3 months"'
                              />
                            )}
                          />
                        </div>
                      )}
                    </AnimatedSizeContainer>

                    {type === "submission" && (
                      <>
                        <div>
                          <label
                            htmlFor="name"
                            className="text-sm font-medium text-neutral-800"
                          >
                            Name
                          </label>
                          <div className="mt-2">
                            <input
                              id="name"
                              type="text"
                              maxLength={100}
                              className={cn(
                                "block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                                errors.name &&
                                  "border-red-600 focus:border-red-500 focus:ring-red-600",
                              )}
                              placeholder={`Create a YouTube video about${program?.name ? ` ${program.name}` : ""}...`}
                              {...register("name", {
                                setValueAs: (value) =>
                                  value === "" ? null : value,
                              })}
                            />
                            <div className="mt-1 text-left">
                              <span className="text-xs text-neutral-400">
                                {name?.length || 0}/100
                              </span>
                            </div>
                          </div>
                        </div>

                        <ToggleGroup
                          className="mt-2 flex w-full items-center gap-1 rounded-md border border-neutral-200 bg-neutral-100 p-1"
                          optionClassName="h-8 flex items-center justify-center rounded-md flex-1 text-sm"
                          indicatorClassName="bg-white border-none rounded-md"
                          options={REWARD_TYPES}
                          selected={rewardType}
                          selectAction={(id: RewardType) => setRewardType(id)}
                        />
                      </>
                    )}

                    {(rewardType === "flat" || type === "performance") && (
                      <div>
                        <label
                          htmlFor="rewardAmount"
                          className="text-sm font-medium text-neutral-800"
                        >
                          Reward
                        </label>
                        <div className="mt-2">
                          <Controller
                            name="rewardAmount"
                            control={control}
                            rules={{
                              required: true,
                              min: 0,
                            }}
                            render={({ field }) => (
                              <AmountInput
                                {...field}
                                id="rewardAmount"
                                amountType="flat"
                                placeholder="200"
                                error={errors.rewardAmount?.message}
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
                              />
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {rewardType === "custom" && type === "submission" && (
                      <div>
                        <label
                          htmlFor="rewardDescription"
                          className="text-sm font-medium text-neutral-800"
                        >
                          Reward
                        </label>
                        <div className="mt-2">
                          <input
                            id="rewardDescription"
                            type="text"
                            maxLength={100}
                            className={cn(
                              "block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                              errors.rewardDescription &&
                                "border-red-600 focus:border-red-500 focus:ring-red-600",
                            )}
                            placeholder="Earn an additional 10% if you hit your revenue goal"
                            {...register("rewardDescription", {
                              setValueAs: (value) =>
                                value === "" ? null : value,
                            })}
                          />
                          <div className="mt-1 text-left">
                            <span className="text-xs text-neutral-400">
                              {rewardDescription?.length || 0}/100
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {type === "performance" && (
                      <div>
                        <span className="text-sm font-medium text-neutral-800">
                          Logic
                        </span>
                        <BountyLogic className="mt-2" />
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="description"
                        className="text-sm font-medium text-neutral-800"
                      >
                        Details
                        <span className="ml-1 font-normal text-neutral-500">
                          (optional)
                        </span>
                      </label>
                      <div className="mt-2">
                        <textarea
                          id="description"
                          rows={3}
                          maxLength={500}
                          className={cn(
                            "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                            errors.description &&
                              "border-red-600 focus:border-red-500 focus:ring-red-600",
                          )}
                          placeholder="Provide any bounty requirements to the partner"
                          {...register("description", {
                            setValueAs: (value) =>
                              value === "" ? null : value,
                          })}
                        />
                        <div className="mt-1 text-left">
                          <span className="text-xs text-neutral-400">
                            {description?.length || 0}/500
                          </span>
                        </div>
                      </div>
                    </div>

                    {rewardType === "custom" && (
                      <div className="gap-4 rounded-lg bg-orange-50 px-4 py-2.5 text-center">
                        <span className="text-sm font-medium text-orange-800">
                          When reviewing these submissions, a custom reward
                          amount will be required to approve.
                        </span>
                      </div>
                    )}
                  </div>
                </ProgramSheetAccordionContent>
              </ProgramSheetAccordionItem>

              {type === "submission" && (
                <ProgramSheetAccordionItem value="submission-requirements">
                  <ProgramSheetAccordionTrigger>
                    Submission requirements
                  </ProgramSheetAccordionTrigger>
                  <ProgramSheetAccordionContent>
                    <div className="space-y-6">
                      <p className="text-content-default text-sm">
                        Set how partners should submit proof of their work. By
                        default an open text field is provided.
                      </p>

                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Switch
                            fn={setRequireImage}
                            checked={requireImage}
                            trackDimensions="w-8 h-4"
                            thumbDimensions="w-3 h-3"
                            thumbTranslate="translate-x-4"
                          />
                          <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-medium text-neutral-700">
                              Require at least one image
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <Switch
                            fn={setRequireUrl}
                            checked={requireUrl}
                            trackDimensions="w-8 h-4"
                            thumbDimensions="w-3 h-3"
                            thumbTranslate="translate-x-4"
                          />
                          <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-medium text-neutral-700">
                              Require at least one URL
                            </h3>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ProgramSheetAccordionContent>
                </ProgramSheetAccordionItem>
              )}

              <ProgramSheetAccordionItem value="groups">
                <ProgramSheetAccordionTrigger>
                  Groups
                </ProgramSheetAccordionTrigger>
                <ProgramSheetAccordionContent>
                  <Controller
                    control={control}
                    name="groupIds"
                    render={({ field }) => (
                      <GroupsMultiSelect
                        selectedGroupIds={field.value}
                        setSelectedGroupIds={(ids) => field.onChange(ids)}
                      />
                    )}
                  />
                </ProgramSheetAccordionContent>
              </ProgramSheetAccordionItem>
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
              disabled={isSubmitting}
            />

            <Button
              type="submit"
              variant="primary"
              text={bounty ? "Update bounty" : "Create bounty"}
              className="w-fit"
              loading={isSubmitting}
              disabled={shouldDisableSubmit}
              disabledTooltip={
                shouldDisableSubmit
                  ? "Please fill all required fields."
                  : undefined
              }
            />
          </div>
        </div>
      </FormProvider>
      {!bounty && confirmModal}
    </form>
  );
}

export function BountySheet({
  isOpen,
  nested,
  ...rest
}: BountySheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "bountyId", scroll: false })}
      nested={nested}
    >
      <BountySheetContent {...rest} />
    </Sheet>
  );
}

export function useBountySheet(
  props: { nested?: boolean } & Omit<BountySheetProps, "setIsOpen"> = {},
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    BountySheet: (
      <BountySheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setShowCreateBountySheet: setIsOpen,
  };
}
