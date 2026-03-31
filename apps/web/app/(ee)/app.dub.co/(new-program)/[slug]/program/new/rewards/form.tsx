"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramData } from "@/lib/types";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import { COMMISSION_TYPES } from "@/lib/zod/schemas/rewards";
import { Button, CircleCheckFill } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";

const DEFAULT_REWARD_TYPES = [
  {
    key: "sale",
    label: "Sale",
    description: "When revenue is generated",
    mostCommon: true,
  },
  {
    key: "lead",
    label: "Lead",
    description: "For sign ups and demos",
    mostCommon: false,
  },
] as const;

const COMMISSION_STRUCTURE_DESCRIPTIONS: Record<string, string> = {
  "one-off": "For referrals and fixed payouts",
  recurring: "For ongoing revenue share",
};

const PAYOUT_MODELS = [
  {
    key: "percentage",
    label: "Percentage",
    description: "Share of the revenue",
    mostCommon: true,
  },
  {
    key: "flat",
    label: "Flat",
    description: "Fixed amount per conversion",
    mostCommon: false,
  },
] as const;

export function Form() {
  const router = useRouter();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { id: workspaceId, slug: workspaceSlug, mutate } = useWorkspace();

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
  >("recurring");

  useEffect(() => {
    setCommissionStructure(maxDuration === 0 ? "one-off" : "recurring");
  }, [maxDuration]);

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/program/new/partners`);
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <div className="flex flex-col gap-10">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <h2 className="text-base font-medium text-neutral-900">
              Reward type
            </h2>
            <p className="mt-1 text-sm font-normal text-neutral-600">
              Set the default reward type for all your affiliates
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {DEFAULT_REWARD_TYPES.map(
              ({ key, label, description, mostCommon }) => {
                const isSelected = key === defaultRewardType;

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex flex-col items-center",
                      mostCommon &&
                        "rounded-md border border-neutral-200 bg-neutral-100",
                    )}
                  >
                    <label
                      className={cn(
                        "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                        "transition-all duration-150",
                        mostCommon && "border-transparent shadow-sm",
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

                          if (key === "sale") {
                            setValue("type", "percentage", {
                              shouldDirty: true,
                            });
                          }

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
                    {mostCommon && (
                      <span className="py-0.5 text-xs font-medium text-neutral-500">
                        Most common
                      </span>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>

        {defaultRewardType === "sale" && (
          <div className="grid grid-cols-1 gap-6">
            <div>
              <h2 className="text-base font-medium text-neutral-900">
                Commission structure
              </h2>
              <p className="mt-1 text-sm font-normal text-neutral-600">
                Set how the affiliate will get rewarded
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {COMMISSION_TYPES.map(({ value, label }) => {
                const isSelected = value === commissionStructure;

                return (
                  <div
                    key={value}
                    className={cn(
                      "flex flex-col items-center",
                      value === "recurring" &&
                        "rounded-md border border-neutral-200 bg-neutral-100",
                    )}
                  >
                    <label
                      className={cn(
                        "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                        "transition-all duration-150",
                        value === "recurring" && "border-transparent shadow-sm",
                        isSelected &&
                          "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                      )}
                    >
                      <input
                        type="radio"
                        value={value}
                        className="hidden"
                        checked={isSelected}
                        onChange={() => {
                          if (value === "one-off") {
                            setCommissionStructure("one-off");
                            setValue("maxDuration", 0, {
                              shouldValidate: true,
                            });
                          }

                          if (value === "recurring") {
                            setCommissionStructure("recurring");
                            setValue("maxDuration", null, {
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
                          {COMMISSION_STRUCTURE_DESCRIPTIONS[value]}
                        </span>
                      </div>
                      <CircleCheckFill
                        className={cn(
                          "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                          isSelected && "scale-100 opacity-100",
                        )}
                      />
                    </label>
                    {value === "recurring" && (
                      <span className="py-0.5 text-xs font-medium text-neutral-500">
                        Most common
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {commissionStructure === "recurring" && (
              <div>
                <label className="text-sm font-medium text-neutral-800">
                  Duration
                </label>
                <select
                  {...register("maxDuration", {
                    setValueAs: (v) => {
                      if (v === "" || v === null) {
                        return null;
                      }

                      return parseInt(v);
                    },
                  })}
                  className="mt-2 block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                >
                  <option value="">Lifetime</option>
                  {RECURRING_MAX_DURATIONS.filter(
                    (v) => v !== 0 && v !== 1, // filter out one-time and 1-month intervals (we only use 1-month for discounts)
                  ).map((duration) => (
                    <option key={duration} value={duration}>
                      {duration} months
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div>
            <h2 className="text-base font-medium text-neutral-900">
              Reward amount
            </h2>
            <p className="mt-1 text-sm font-normal text-neutral-600">
              Set how much the affiliate will get rewarded
            </p>
          </div>

          {defaultRewardType === "sale" && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {PAYOUT_MODELS.map(({ key, label, description, mostCommon }) => {
                const isSelected = key === type;

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex flex-col items-center",
                      mostCommon &&
                        "rounded-md border border-neutral-200 bg-neutral-100",
                    )}
                  >
                    <label
                      className={cn(
                        "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                        "transition-all duration-150",
                        mostCommon && "border-transparent shadow-sm",
                        isSelected &&
                          "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                      )}
                    >
                      <input
                        type="radio"
                        value={key}
                        className="hidden"
                        checked={isSelected}
                        onChange={() =>
                          setValue("type", key, { shouldDirty: true })
                        }
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
                    {mostCommon && (
                      <span className="py-0.5 text-xs font-medium text-neutral-500">
                        Most common
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-neutral-800">
              {type === "percentage" ? "Percentage" : "Amount"} per{" "}
              {defaultRewardType}
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
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
          </div>
        </div>
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
