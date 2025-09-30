"use client";

import { createRewardAction } from "@/lib/actions/partners/create-reward";
import { deleteRewardAction } from "@/lib/actions/partners/delete-reward";
import { updateRewardAction } from "@/lib/actions/partners/update-reward";
import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useGroup from "@/lib/swr/use-group";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { RewardConditionsArray, RewardProps } from "@/lib/types";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import {
  createOrUpdateRewardSchema,
  ENTITY_ATTRIBUTE_TYPES,
  rewardConditionsArraySchema,
  rewardConditionSchema,
  rewardConditionsSchema,
} from "@/lib/zod/schemas/rewards";
import { X } from "@/ui/shared/icons";
import { EventType, RewardStructure } from "@dub/prisma/client";
import {
  Button,
  Gift,
  MoneyBills2,
  Pen2,
  Sheet,
  Tooltip,
  TooltipContent,
  useRouterStuff,
} from "@dub/ui";
import { capitalize, cn, pluralize } from "@dub/utils";
import { motion } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";
import {
  InlineBadgePopover,
  InlineBadgePopoverContext,
  InlineBadgePopoverInput,
  InlineBadgePopoverMenu,
} from "../../shared/inline-badge-popover";
import { usePartnersUpgradeModal } from "../partners-upgrade-modal";
import { RewardIconSquare } from "./reward-icon-square";
import { RewardPartnersCard } from "./reward-partners-card";
import { REWARD_TYPES, RewardsLogic } from "./rewards-logic";

interface RewardSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  event: EventType;
  reward?: RewardProps;
  defaultRewardValues?: RewardProps;
}

// Special form schema to allow for empty condition fields when adding a new condition
const formSchema = createOrUpdateRewardSchema.extend({
  modifiers: z
    .array(
      rewardConditionsSchema.extend({
        conditions: z.array(rewardConditionSchema.partial()).min(1),
      }),
    )
    .min(1),
});

type FormData = z.infer<typeof formSchema>;

export const useAddEditRewardForm = () => useFormContext<FormData>();

function RewardSheetContent({
  setIsOpen,
  event,
  reward,
  defaultRewardValues,
}: RewardSheetProps) {
  const { group, mutateGroup } = useGroup();
  const { id: workspaceId, defaultProgramId, plan } = useWorkspace();
  const formRef = useRef<HTMLFormElement>(null);
  const { mutate: mutateProgram } = useProgram();
  const { queryParams } = useRouterStuff();

  const defaultValuesSource = reward || defaultRewardValues;

  const form = useForm<FormData>({
    defaultValues: {
      event,
      type:
        defaultValuesSource?.type || (event === "sale" ? "percentage" : "flat"),
      maxDuration: defaultValuesSource
        ? defaultValuesSource.maxDuration === null
          ? Infinity
          : defaultValuesSource.maxDuration
        : Infinity,
      amount:
        defaultValuesSource?.type === "flat"
          ? defaultValuesSource.amount / 100
          : defaultValuesSource?.amount,
      description: defaultValuesSource?.description ?? null,
      modifiers: defaultValuesSource?.modifiers?.map((m) => {
        const type = m.type === undefined ? defaultValuesSource?.type : m.type;
        const maxDuration =
          m.maxDuration === undefined
            ? defaultValuesSource?.maxDuration
            : m.maxDuration;

        return {
          ...m,
          conditions: m.conditions.map((c) => ({
            ...c,
            value:
              ENTITY_ATTRIBUTE_TYPES[c.entity]?.[c.attribute] === "currency" &&
              c.value !== "" &&
              c.value != null &&
              !Number.isNaN(Number(c.value))
                ? Number(c.value) / 100
                : c.value,
          })),
          amount: type === "flat" ? m.amount / 100 : m.amount,
          maxDuration: m.maxDuration === null ? Infinity : maxDuration,
        };
      }),
    },
  });

  const { handleSubmit, watch, setValue, setError } = form;

  const [selectedEvent, amount, type, maxDuration, description, modifiers] =
    watch([
      "event",
      "amount",
      "type",
      "maxDuration",
      "description",
      "modifiers",
    ]);

  const { executeAsync: createReward, isPending: isCreating } = useAction(
    createRewardAction,
    {
      onSuccess: async () => {
        setIsOpen(false);
        toast.success("Reward created!");
        await mutateProgram();
        await mutateGroup();
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
        queryParams({ del: "rewardId", scroll: false });
        toast.success("Reward updated!");
        await mutateProgram();
        await mutateGroup();
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
        await mutateGroup();
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const [showAdvancedUpsell, setShowAdvancedUpsell] = useState(false);

  useEffect(() => {
    if (
      modifiers?.length &&
      !getPlanCapabilities(plan).canUseAdvancedRewardLogic
    ) {
      setShowAdvancedUpsell(true);
    } else {
      setShowAdvancedUpsell(false);
    }
  }, [modifiers, plan]);

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !defaultProgramId || showAdvancedUpsell || !group) {
      return;
    }

    let modifiers: RewardConditionsArray | null = null;

    if (data.modifiers?.length) {
      try {
        modifiers = rewardConditionsArraySchema.parse(
          data.modifiers.map((m) => {
            const type = m.type === undefined ? data.type : m.type;
            const maxDuration =
              m.maxDuration === undefined ? data.maxDuration : m.maxDuration;

            return {
              ...m,
              conditions: m.conditions.map((c) => ({
                ...c,
                value:
                  c.entity &&
                  c.attribute &&
                  ENTITY_ATTRIBUTE_TYPES[c.entity]?.[c.attribute] === "currency"
                    ? c.value === "" ||
                      c.value == null ||
                      Number.isNaN(Number(c.value))
                      ? c.value
                      : Math.round(Number(c.value) * 100)
                    : c.value,
              })),
              amount: type === "flat" ? Math.round(m.amount * 100) : m.amount,
              maxDuration: maxDuration === Infinity ? null : maxDuration,
            };
          }),
        );
      } catch (error) {
        console.log("parse error", error);
        setError("root.logic", { message: "Invalid reward condition" });
        toast.error(
          "Invalid reward condition. Please fix the errors and try again.",
        );
        return;
      }
    }

    const payload = {
      ...data,
      workspaceId,
      amount: type === "flat" ? Math.round(data.amount * 100) : data.amount,
      maxDuration:
        Infinity === Number(data.maxDuration) ? null : data.maxDuration,
      modifiers,
    };

    if (!reward) {
      await createReward({
        ...payload,
        groupId: group.id,
      });
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

  const { partnersUpgradeModal, setShowPartnersUpgradeModal } =
    usePartnersUpgradeModal({
      plan: "Advanced",
      description:
        "When you upgrade to Advanced, you'll get access to higher payout limits, advanced reward structures, embedded referral dashboard, and more.",
    });

  return (
    <FormProvider {...form}>
      {partnersUpgradeModal}
      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className="flex h-full flex-col"
      >
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            {reward ? "Edit" : "Create"} {selectedEvent} reward
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <RewardSheetCard
            title={
              <div className="w-full">
                <div className="flex min-w-0 items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <RewardIconSquare icon={MoneyBills2} />
                    <span className="leading-relaxed">
                      Pay{" "}
                      {selectedEvent === "sale" && (
                        <>
                          a{" "}
                          <InlineBadgePopover text={capitalize(type)}>
                            <InlineBadgePopoverMenu
                              selectedValue={type}
                              onSelect={(value) =>
                                setValue("type", value as RewardStructure, {
                                  shouldDirty: true,
                                })
                              }
                              items={REWARD_TYPES}
                            />
                          </InlineBadgePopover>{" "}
                          {type === "percentage" && "of "}
                        </>
                      )}
                      <InlineBadgePopover
                        text={
                          !isNaN(amount)
                            ? constructRewardAmount({
                                amount: type === "flat" ? amount * 100 : amount,
                                type,
                                maxDuration,
                              })
                            : "amount"
                        }
                        invalid={isNaN(amount)}
                      >
                        <AmountInput />
                      </InlineBadgePopover>{" "}
                      per {selectedEvent}
                      {selectedEvent === "sale" && (
                        <>
                          {" "}
                          <InlineBadgePopover
                            text={
                              maxDuration === 0
                                ? "one time"
                                : maxDuration === Infinity
                                  ? "for the customer's lifetime"
                                  : `for ${maxDuration} ${pluralize("month", Number(maxDuration))}`
                            }
                          >
                            <InlineBadgePopoverMenu
                              selectedValue={maxDuration?.toString()}
                              onSelect={(value) =>
                                setValue("maxDuration", Number(value), {
                                  shouldDirty: true,
                                })
                              }
                              items={[
                                {
                                  text: "one time",
                                  value: "0",
                                },
                                ...RECURRING_MAX_DURATIONS.filter(
                                  (v) => v !== 0 && v !== 1, // filter out one-time and 1-month intervals (we only use 1-month for discounts)
                                ).map((v) => ({
                                  text: `for ${v} ${pluralize("month", Number(v))}`,
                                  value: v.toString(),
                                })),
                                {
                                  text: "for the customer's lifetime",
                                  value: "Infinity",
                                },
                              ]}
                            />
                          </InlineBadgePopover>
                        </>
                      )}
                    </span>
                  </div>
                  <Tooltip
                    content={"Add a custom reward description"}
                    disabled={description !== null}
                  >
                    <div className="shrink-0">
                      <Button
                        variant="secondary"
                        className={cn(
                          "size-7 p-0",
                          description !== null && "text-blue-600",
                        )}
                        icon={<Pen2 className="size-3.5" />}
                        onClick={() =>
                          setValue(
                            "description",
                            description === null ? "" : null,
                            { shouldDirty: true },
                          )
                        }
                      />
                    </div>
                  </Tooltip>
                </div>
                <motion.div
                  initial={false}
                  transition={{ ease: "easeInOut", duration: 0.2 }}
                  animate={{
                    height: description !== null ? "auto" : 0,
                    opacity: description !== null ? 1 : 0,
                  }}
                  className="-mx-2.5 overflow-hidden"
                >
                  <div className="pt-2.5">
                    <div className="border-border-subtle flex min-w-0 items-center gap-2.5 border-t px-2.5 pt-2.5">
                      <RewardIconSquare icon={Gift} />
                      <span className="grow leading-relaxed">
                        Shown as{" "}
                        <InlineBadgePopover
                          text={description || "Reward description"}
                          invalid={!description}
                        >
                          <InlineBadgePopoverInput
                            value={description ?? ""}
                            onChange={(e) =>
                              setValue(
                                "description",
                                (e.target as HTMLInputElement).value,
                                {
                                  shouldDirty: true,
                                },
                              )
                            }
                            className="sm:w-80"
                            maxLength={100}
                          />
                        </InlineBadgePopover>
                      </span>
                      <Button
                        variant="outline"
                        className="size-6 shrink-0 p-0"
                        icon={<X className="size-3" strokeWidth={2} />}
                        onClick={() =>
                          setValue("description", null, { shouldDirty: true })
                        }
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            }
            content={
              selectedEvent === "click" ? undefined : (
                <RewardsLogic isDefaultReward={false} />
              )
            }
          />

          <VerticalLine />

          {group && <RewardPartnersCard groupId={group.id} />}
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
                disabled={isCreating || isUpdating}
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
              disabledTooltip={
                showAdvancedUpsell ? (
                  <TooltipContent
                    title="Advanced reward structures are only available on the Advanced plan and above."
                    cta="Upgrade to Advanced"
                    onClick={() => setShowPartnersUpgradeModal(true)}
                  />
                ) : undefined
              }
            />
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

function RewardSheetCard({
  title,
  content,
}: PropsWithChildren<{ title: ReactNode; content: ReactNode }>) {
  return (
    <div className="border-border-subtle rounded-xl border bg-white text-sm shadow-sm">
      <div className="text-content-emphasis flex items-center gap-2.5 p-2.5 font-medium">
        {title}
      </div>
      {content && (
        <div className="border-border-subtle -mx-px rounded-xl border-x border-t bg-neutral-50 p-2.5">
          {content}
        </div>
      )}
    </div>
  );
}

const VerticalLine = () => (
  <div className="bg-border-subtle ml-6 h-4 w-px shrink-0" />
);

function AmountInput() {
  const { watch, register } = useAddEditRewardForm();
  const type = watch("type");

  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  return (
    <div className="relative rounded-md shadow-sm">
      {type === "flat" && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-sm text-neutral-400">
          $
        </span>
      )}
      <input
        className={cn(
          "block w-full rounded-md border-neutral-300 px-1.5 py-1 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:w-32 sm:text-sm",
          type === "flat" ? "pl-4 pr-12" : "pr-7",
        )}
        {...register("amount", {
          required: true,
          setValueAs: (value: string) => (value === "" ? undefined : +value),
          min: 0,
          max: type === "percentage" ? 100 : undefined,
          onChange: handleMoneyInputChange,
        })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setIsOpen(false);
            return;
          }

          handleMoneyKeyDown(e);
        }}
      />
      <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-sm text-neutral-400">
        {type === "flat" ? "USD" : "%"}
      </span>
    </div>
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
  const { queryParams } = useRouterStuff();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      nested={nested}
      onClose={() => queryParams({ del: "rewardId", scroll: false })}
    >
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
