"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updateProgramAction } from "@/lib/actions/partners/update-program";
import {
  ALLOWED_MIN_PAYOUT_AMOUNTS,
  PAYOUT_HOLDING_PERIOD_DAYS,
} from "@/lib/constants/payouts";
import { mutatePrefix } from "@/lib/swr/mutate";
import useGroup from "@/lib/swr/use-group";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { X } from "@/ui/shared/icons";
import { Button, Checkbox, Sheet, Slider } from "@dub/ui";
import NumberFlow from "@number-flow/react";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ProgramPayoutMethods } from "./program-payout-methods";
import { ProgramPayoutModeSection } from "./program-payout-mode-section";

type ProgramPayoutSettingsSheetProps = {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

type FormData = Pick<ProgramProps, "holdingPeriodDays" | "minPayoutAmount"> & {
  applyHoldingPeriodDaysToAllGroups: boolean;
};

function ProgramPayoutSettingsSheetContent({
  setIsOpen,
}: ProgramPayoutSettingsSheetProps) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { program } = useProgram();
  const { group: defaultGroup } = useGroup({
    groupIdOrSlug: DEFAULT_PARTNER_GROUP.slug,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      applyHoldingPeriodDaysToAllGroups: false,
    },
  });

  useEffect(() => {
    if (program && defaultGroup) {
      setValue("holdingPeriodDays", defaultGroup.holdingPeriodDays);
      setValue("minPayoutAmount", program.minPayoutAmount);
    }
  }, [program, defaultGroup, setValue]);

  const { executeAsync } = useAction(updateProgramAction, {
    onSuccess: async () => {
      toast.success("Payout settings updated successfully.");
      setIsOpen(false);
      mutatePrefix([`/api/programs/${defaultProgramId}`, `/api/groups`]);
    },
    onError: ({ error }) => {
      toast.error(parseActionError(error, "Failed to update payout settings."));
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId) {
      return;
    }

    await executeAsync({
      workspaceId,
      ...data,
    });
  };

  const minPayoutAmount = watch("minPayoutAmount");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Payout settings
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

      <div className="h-full divide-y divide-neutral-200 bg-neutral-50 p-4 sm:p-6">
        {/* Payout holding period */}
        <div className="space-y-6 pb-6">
          <div>
            <h4 className="text-base font-semibold leading-6 text-neutral-900">
              Payout holding period
            </h4>
            <p className="text-sm font-medium text-neutral-500">
              Set how long to hold funds before they are eligible for payout.
            </p>
          </div>
          <div>
            <div className="relative rounded-md shadow-sm">
              <select
                className="block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                {...register("holdingPeriodDays", { required: true })}
              >
                {PAYOUT_HOLDING_PERIOD_DAYS.map((v) => (
                  <option value={v} key={v}>
                    {v} days {v === 30 && " (recommended)"}
                  </option>
                ))}
              </select>
            </div>
            <label className="mt-3 flex w-full items-center gap-2.5 text-sm font-medium leading-none">
              <Controller
                control={control}
                name="applyHoldingPeriodDaysToAllGroups"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    className="border-border-default size-4 rounded focus:border-[var(--brand)] focus:ring-[var(--brand)] focus-visible:border-[var(--brand)] focus-visible:ring-[var(--brand)] data-[state=checked]:bg-black data-[state=indeterminate]:bg-black"
                    onCheckedChange={field.onChange}
                  />
                )}
              />

              <span className="text-content-emphasis text-sm">
                Apply to all groups
              </span>
            </label>
          </div>
        </div>

        {/* Minimum payout amount */}
        <div className="space-y-6 py-6">
          <div>
            <h4 className="text-base font-semibold leading-6 text-neutral-900">
              Minimum payout amount
            </h4>
            <p className="text-sm font-medium text-neutral-500">
              Set the minimum amount required for funds to be eligible for
              payout.
            </p>
          </div>

          <div>
            <input
              type="hidden"
              {...register("minPayoutAmount", {
                required: true,
                valueAsNumber: true,
              })}
            />
            <NumberFlow
              value={minPayoutAmount ? minPayoutAmount / 100 : 0}
              suffix=" USD"
              format={{
                style: "currency",
                currency: "USD",
                // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                trailingZeroDisplay: "stripIfInteger",
              }}
              className="mb-2 text-2xl font-medium leading-6 text-neutral-800"
            />

            <Slider
              value={minPayoutAmount}
              min={ALLOWED_MIN_PAYOUT_AMOUNTS[0]}
              max={
                ALLOWED_MIN_PAYOUT_AMOUNTS[
                  ALLOWED_MIN_PAYOUT_AMOUNTS.length - 1
                ]
              }
              onChange={(value) => {
                const closest = ALLOWED_MIN_PAYOUT_AMOUNTS.reduce(
                  (prev, curr) =>
                    Math.abs(curr - value) < Math.abs(prev - value)
                      ? curr
                      : prev,
                );

                setValue("minPayoutAmount", closest, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              marks={ALLOWED_MIN_PAYOUT_AMOUNTS}
            />
          </div>
        </div>

        {/* Payout methods */}
        <div className="py-6">
          <ProgramPayoutMethods />
        </div>

        {program?.payoutMode !== "internal" && (
          <div className="py-6">
            <ProgramPayoutModeSection />
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-end gap-2 p-5">
          <Button
            variant="secondary"
            text="Cancel"
            disabled={isSubmitting}
            className="h-8 w-fit px-3"
            onClick={() => setIsOpen(false)}
          />

          <Button
            text="Save"
            className="h-8 w-fit px-3"
            loading={isSubmitting}
            disabled={!isDirty || !isValid}
            type="submit"
          />
        </div>
      </div>
    </form>
  );
}

export function ProgramPayoutSettingsSheet({
  isOpen,
  ...rest
}: ProgramPayoutSettingsSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <ProgramPayoutSettingsSheetContent {...rest} />
    </Sheet>
  );
}

export function useProgramPayoutSettingsSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    programPayoutSettingsSheet: (
      <ProgramPayoutSettingsSheet setIsOpen={setIsOpen} isOpen={isOpen} />
    ),
    setIsOpen,
  };
}
