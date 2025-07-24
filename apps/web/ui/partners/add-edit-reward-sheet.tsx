"use client";

import { createRewardAction } from "@/lib/actions/partners/create-reward";
import { deleteRewardAction } from "@/lib/actions/partners/delete-reward";
import { updateRewardAction } from "@/lib/actions/partners/update-reward";
import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useRewardPartners from "@/lib/swr/use-reward-partners";
import useWorkspace from "@/lib/swr/use-workspace";
import { RewardProps } from "@/lib/types";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import {
  createRewardSchema,
  REWARD_EVENT_COLUMN_MAPPING,
} from "@/lib/zod/schemas/rewards";
import { X } from "@/ui/shared/icons";
import { EventType } from "@dub/prisma/client";
import { Button, Icon, MoneyBills2, Sheet, Users } from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";
import {
  InlineBadgePopover,
  InlineBadgePopoverMenu,
} from "./inline-badge-popover";
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

  const [
    amount,
    type,
    maxDuration,
    includedPartnerIds = [],
    excludedPartnerIds = [],
  ] = watch([
    "amount",
    "type",
    "maxDuration",
    "includedPartnerIds",
    "excludedPartnerIds",
  ]);

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

        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          {selectedEvent === "sale" && (
            <RewardSheetCard
              title={
                <>
                  <IconSquare icon={MoneyBills2} />
                  <span className="leading-relaxed">
                    Pay a{" "}
                    <InlineBadgePopover text={type}>
                      <InlineBadgePopoverMenu
                        selectedValue={type}
                        onSelect={(value) =>
                          setValue("type", value as "flat" | "percentage", {
                            shouldDirty: true,
                          })
                        }
                        items={[
                          {
                            text: "Flat",
                            value: "flat",
                          },
                          {
                            text: "Percentage",
                            value: "percentage",
                          },
                        ]}
                      />
                    </InlineBadgePopover>{" "}
                    {type === "percentage" && "of "}
                    <InlineBadgePopover
                      text={
                        amount
                          ? constructRewardAmount({
                              amount: type === "flat" ? amount * 100 : amount,
                              type,
                            })
                          : "amount"
                      }
                      invalid={!amount}
                    >
                      <div className="relative rounded-md shadow-sm">
                        {type === "flat" && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                            $
                          </span>
                        )}
                        <input
                          className={cn(
                            "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:w-32 sm:text-sm",
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
                    </InlineBadgePopover>{" "}
                    per {selectedEvent}{" "}
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
                          ...RECURRING_MAX_DURATIONS.filter((v) => v !== 0).map(
                            (v) => ({
                              text: `for ${v} ${pluralize("month", Number(v))}`,
                              value: v.toString(),
                            }),
                          ),
                          {
                            text: "for the customer's lifetime",
                            value: "Infinity",
                          },
                        ]}
                      />
                    </InlineBadgePopover>
                  </span>
                </>
              }
              content={<></>}
            />
          )}

          <VerticalLine />
          <RewardSheetCard
            title={
              <>
                <IconSquare icon={Users} />
                {isDefault ? (
                  <span>
                    To all partners
                    {!!excludedPartnerIds?.length && (
                      <>
                        , excluding{" "}
                        <strong className="font-semibold">
                          {excludedPartnerIds.length}
                        </strong>{" "}
                        {pluralize("partner", excludedPartnerIds.length)}
                      </>
                    )}
                  </span>
                ) : (
                  <span>
                    To {includedPartnerIds?.length || 0}{" "}
                    {pluralize("partner", includedPartnerIds?.length || 0)}
                  </span>
                )}
              </>
            }
            content={
              <div className="space-y-4">
                <RewardPartnersTable
                  event={selectedEvent}
                  rewardId={reward?.id}
                  partnerIds={
                    (isDefault ? excludedPartnerIds : includedPartnerIds) || []
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
            }
          />
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

const VerticalLine = () => (
  <div className="bg-border-subtle ml-6 h-4 w-px shrink-0" />
);

const IconSquare = ({ icon: Icon }: { icon: Icon }) => (
  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
    <Icon className="size-4 text-neutral-800" />
  </div>
);

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
