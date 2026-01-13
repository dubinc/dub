"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramData } from "@/lib/types";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import { COMMISSION_TYPES } from "@/lib/zod/schemas/rewards";
import { AnimatedSizeContainer, Button, CircleCheckFill } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { useOnboardingProgress } from "../../../use-onboarding-progress";

const DEFAULT_REWARD_TYPES = [
  {
    key: "sale",
    label: "Sale",
    description: "For purchases",
  },
  {
    key: "lead",
    label: "Lead",
    description: "For sign ups",
  },
] as const;

export function Form() {
  const { continueTo } = useOnboardingProgress();

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { id: workspaceId, mutate } = useWorkspace();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<ProgramData>();

  const [type, defaultRewardType, maxDuration] = watch([
    "type",
    "defaultRewardType",
    "maxDuration",
  ]);

  const [commissionStructure, setCommissionStructure] = useState<
    "one-off" | "recurring"
  >("one-off");

  useEffect(
    () => setCommissionStructure(maxDuration ? "recurring" : "one-off"),
    [maxDuration],
  );

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      continueTo("plan");
      mutate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: ProgramData) => {
    if (!workspaceId) {
      return;
    }

    setHasSubmitted(true);

    await executeAsync({
      ...data,
      amountInCents:
        data.amountInCents != null && data.type === "flat"
          ? Math.round(data.amountInCents * 100)
          : null,
      amountInPercentage:
        data.amountInPercentage != null && data.type === "percentage"
          ? data.amountInPercentage
          : null,
      workspaceId,
      step: "configure-reward",
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6 px-2"
    >
      <div className="grid grid-cols-1 gap-2">
        <h2 className="text-content-emphasis text-sm font-semibold">
          Reward type
        </h2>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {DEFAULT_REWARD_TYPES.map(({ key, label, description }) => {
            const isSelected = key === defaultRewardType;

            return (
              <label
                key={key}
                className={cn(
                  "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                  "transition-all duration-150",
                  isSelected &&
                    "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                )}
              >
                <input
                  type="radio"
                  value={key}
                  className="hidden"
                  checked={isSelected}
                  onChange={() => {
                    setValue("defaultRewardType", key, {
                      shouldDirty: true,
                    });

                    if (key === "lead") {
                      setValue("type", "flat", { shouldDirty: true });
                      setValue("maxDuration", 0, { shouldDirty: true });
                    }
                  }}
                />
                <div className="flex grow flex-col text-sm">
                  <span className="text-sm font-semibold text-neutral-900">
                    {label}
                  </span>
                  <span className="text-sm font-normal text-neutral-600">
                    {description}
                  </span>
                </div>
                <CircleCheckFill
                  className={cn(
                    "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                    isSelected && "scale-100 opacity-100",
                  )}
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="-m-1">
        <AnimatedSizeContainer
          height
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="flex flex-col gap-6 p-1">
            {defaultRewardType === "sale" && (
              <div className="space-y-2">
                <h2 className="text-content-emphasis text-sm font-semibold">
                  Commission structure
                </h2>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {COMMISSION_TYPES.map(
                    ({ value, label, shortDescription }) => {
                      const isSelected = value === commissionStructure;

                      return (
                        <label
                          key={value}
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
                              if (value === "one-off") {
                                setCommissionStructure("one-off");
                                setValue("maxDuration", 0, {
                                  shouldValidate: true,
                                });
                              }

                              if (value === "recurring") {
                                setCommissionStructure("recurring");
                                setValue("maxDuration", 12, {
                                  shouldValidate: true,
                                });
                              }
                            }}
                          />
                          <div className="flex grow flex-col text-sm">
                            <span className="text-sm font-semibold text-neutral-900">
                              {label}
                            </span>
                            <span className="text-sm font-normal text-neutral-600">
                              {shortDescription}
                            </span>
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
              </div>
            )}

            {defaultRewardType === "sale" &&
              commissionStructure === "recurring" && (
                <label className="space-y-2">
                  <span className="block text-sm font-medium text-neutral-800">
                    Duration
                  </span>
                  <select
                    {...register("maxDuration", {
                      setValueAs: (v) => {
                        if (v === "" || v === null) {
                          return null;
                        }

                        return parseInt(v);
                      },
                    })}
                    className="block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                  >
                    {RECURRING_MAX_DURATIONS.filter(
                      (v) => v !== 0 && v !== 1, // filter out one-time and 1-month intervals (we only use 1-month for discounts)
                    ).map((duration) => (
                      <option key={duration} value={duration}>
                        {duration} {duration === 1 ? "month" : "months"}
                      </option>
                    ))}
                    <option value="">Lifetime</option>
                  </select>
                </label>
              )}

            {defaultRewardType === "sale" && (
              <label className="space-y-2">
                <span className="text-content-emphasis block text-sm font-semibold">
                  Payout model
                </span>
                <select
                  {...register("type")}
                  className="block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                >
                  <option value="flat">Flat</option>
                  <option value="percentage">Percentage</option>
                </select>
              </label>
            )}

            <label className="space-y-2">
              <span className="text-content-emphasis block text-sm font-semibold">
                Amount per {defaultRewardType}
              </span>
              <div className="relative rounded-md shadow-sm">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                  {type === "flat" && "$"}
                </span>
                <input
                  className={cn(
                    "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    type === "flat" ? "pl-6 pr-12" : "pr-7",
                  )}
                  {...register(
                    type === "flat" ? "amountInCents" : "amountInPercentage",
                    {
                      required: true,
                      valueAsNumber: true,
                      min: 0,
                      max: type === "flat" ? 1000 : 100,
                      onChange: handleMoneyInputChange,
                    },
                  )}
                  onKeyDown={handleMoneyKeyDown}
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                  {type === "flat" ? "USD" : "%"}
                </span>
              </div>
            </label>
          </div>
        </AnimatedSizeContainer>
      </div>

      <Button
        text="Continue"
        className="w-full"
        loading={isSubmitting || isPending}
        disabled={hasSubmitted}
        type="submit"
      />
    </form>
  );
}
