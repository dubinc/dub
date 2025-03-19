"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updateProgramAction } from "@/lib/actions/partners/update-program";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { HOLDING_PERIOD_DAYS } from "@/lib/zod/schemas/programs";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { SettingsRow } from "../settings-row";

type FormData = Pick<ProgramProps, "holdingPeriodDays" | "minPayoutAmount">;

export function RewardSettings() {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const {
    register,
    handleSubmit,
    formState: { isDirty, isValid, isSubmitting, errors },
  } = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      holdingPeriodDays: program?.holdingPeriodDays,
      minPayoutAmount: program?.minPayoutAmount
        ? program?.minPayoutAmount / 100
        : undefined,
    },
  });

  const { executeAsync } = useAction(updateProgramAction, {
    onSuccess: async () => {
      await mutate(`/api/programs/${program?.id}?workspaceId=${workspaceId}`);
      toast.success("Reward settings updated successfully.");
    },
    onError: ({ error }) => {
      toast.error(parseActionError(error, "Failed to update reward settings."));
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !program?.id) {
      return;
    }

    await executeAsync({
      workspaceId,
      programId: program.id,
      ...data,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="p-6">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-900">
            Reward settings
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            These are applied to all reward types
          </p>
        </div>
        <div className="divide-y divide-neutral-200 border-t border-neutral-200 px-6">
          <SettingsRow
            heading="Holding period"
            description="Set the holding period before payouts are released"
          >
            <div className="flex items-center justify-end">
              <div className="w-full max-w-md">
                <select
                  className="block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                  {...register("holdingPeriodDays", { required: true })}
                >
                  {HOLDING_PERIOD_DAYS.map((v) => (
                    <option value={v} key={v}>
                      {v} days {v === 30 && " (recommended)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SettingsRow>

          <SettingsRow
            heading="Minimum payout amount"
            description="Set the minimum payout amount (cannot be less than $100)"
          >
            <div className="flex items-center justify-end">
              <div className="w-full max-w-md">
                <div className="relative mt-2 rounded-md shadow-sm">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                    $
                  </span>

                  <input
                    className={cn(
                      "block w-full rounded-md border-neutral-300 pl-6 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                      errors.minPayoutAmount &&
                        "border-red-600 pr-7 focus:border-red-500 focus:ring-red-600",
                    )}
                    {...register("minPayoutAmount", {
                      required: true,
                      valueAsNumber: true,
                      min: 100,
                      onChange: handleMoneyInputChange,
                    })}
                    onKeyDown={handleMoneyKeyDown}
                    placeholder="100"
                  />

                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                    USD
                  </span>
                </div>
              </div>
            </div>
          </SettingsRow>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-6 py-4">
          <Button
            text="Save changes"
            variant="primary"
            className="h-8 w-fit"
            loading={isSubmitting}
            disabled={!isDirty || !isValid}
          />
        </div>
      </div>
    </form>
  );
}
