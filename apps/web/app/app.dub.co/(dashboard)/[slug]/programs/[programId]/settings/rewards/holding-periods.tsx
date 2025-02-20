"use client";

import { updateProgramAction } from "@/lib/actions/partners/update-program";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { HOLDING_PERIOD_DAYS } from "@/lib/zod/schemas/programs";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { SettingsRow } from "../settings-row";

type FormData = Pick<ProgramProps, "holdingPeriodDays">;

export function HoldingPeriods() {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const form = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      holdingPeriodDays: program?.holdingPeriodDays,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { isDirty, isValid, isSubmitting },
  } = form;

  const { executeAsync } = useAction(updateProgramAction, {
    async onSuccess() {
      toast.success("Holding period updated successfully.");
      mutate(`/api/programs/${program?.id}?workspaceId=${workspaceId}`);
    },
    onError({ error }) {
      console.log(error);
      toast.error("Failed to update holding period.");
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
        <div className="border-t border-neutral-200 px-6">
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
