"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updateProgramAction } from "@/lib/actions/partners/update-program";
import {
  ALLOWED_MIN_PAYOUT_AMOUNTS,
  getAllowedMinPayoutAmounts,
} from "@/lib/constants/payouts";
import { mutatePrefix } from "@/lib/swr/mutate";
import useGroups from "@/lib/swr/use-groups";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Sheet, Slider } from "@dub/ui";
import NumberFlow from "@number-flow/react";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  HoldingPeriodUpdate,
  ProgramPayoutHoldingPeriods,
  useProgramHoldingPeriods,
} from "./program-payout-holding-periods";
import { ProgramPayoutMethods } from "./program-payout-methods";
import { ProgramPayoutModeSection } from "./program-payout-mode-section";

type ProgramPayoutSettingsSheetProps = {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

type FormData = Pick<ProgramProps, "minPayoutAmount">;

function ProgramPayoutSettingsSheetContent({
  setIsOpen,
}: ProgramPayoutSettingsSheetProps) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { program } = useProgram();
  const { groups, loading: groupsLoading } = useGroups({
    query: { sortBy: "createdAt", sortOrder: "asc" },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onBlur",
    // Resets the form (and recomputes isDirty/isValid) once the program loads
    values: program ? { minPayoutAmount: program.minPayoutAmount } : undefined,
  });

  // Holding period edits are staged until the form is saved
  const holdingPeriods = useProgramHoldingPeriods(groups);

  const { executeAsync } = useAction(updateProgramAction);

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !program) {
      return;
    }

    const requests: Promise<void>[] = [];

    if (data.minPayoutAmount !== program.minPayoutAmount) {
      requests.push(
        executeAsync({
          workspaceId,
          minPayoutAmount: data.minPayoutAmount,
        }).then((result) => {
          if (result?.serverError || result?.validationErrors) {
            throw new Error(
              parseActionError(
                result,
                "Failed to update minimum payout amount.",
              ),
            );
          }
        }),
      );
    }

    requests.push(
      ...holdingPeriods.pendingUpdates.map((update) =>
        updateGroupHoldingPeriod({ workspaceId, ...update }),
      ),
    );

    const results = await Promise.allSettled(requests);

    // Refresh the program + groups even if a request failed, so the sheet reflects what was saved
    await mutatePrefix([`/api/programs/${defaultProgramId}`, "/api/groups"]);

    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    if (failure) {
      toast.error(
        failure.reason instanceof Error
          ? failure.reason.message
          : "Failed to update payout settings.",
      );
      return;
    }

    toast.success("Payout settings updated successfully.");
    setIsOpen(false);
  };

  const minPayoutAmount = watch("minPayoutAmount");
  const allowedMinPayoutAmounts = workspaceId
    ? getAllowedMinPayoutAmounts(workspaceId)
    : ALLOWED_MIN_PAYOUT_AMOUNTS;

  const hasChanges = isDirty || holdingPeriods.pendingUpdates.length > 0;

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

      <div className="flex h-full flex-col gap-8 bg-neutral-50 p-4 sm:p-6">
        {/* Minimum payout amount */}
        <div className="space-y-6">
          <div>
            <h4 className="text-base font-semibold leading-6 text-neutral-900">
              Minimum payout amount
            </h4>
            <p className="text-sm font-medium text-neutral-500">
              Set the minimum amount required for payouts to be processed.
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
              min={allowedMinPayoutAmounts[0]}
              max={allowedMinPayoutAmounts[allowedMinPayoutAmounts.length - 1]}
              onChange={(value) => {
                const closest = allowedMinPayoutAmounts.reduce((prev, curr) =>
                  Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
                );

                setValue("minPayoutAmount", closest, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              marks={allowedMinPayoutAmounts}
            />
          </div>
        </div>

        {/* Payout methods */}
        <ProgramPayoutMethods />

        {program?.payoutMode !== "internal" && <ProgramPayoutModeSection />}

        {/* Payout holding period */}
        <ProgramPayoutHoldingPeriods
          loading={groupsLoading}
          holdingPeriods={holdingPeriods}
        />
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
            disabled={!hasChanges || !isValid}
            type="submit"
          />
        </div>
      </div>
    </form>
  );
}

async function updateGroupHoldingPeriod({
  workspaceId,
  groupId,
  holdingPeriodDays,
  applyToAllGroups,
}: HoldingPeriodUpdate & { workspaceId: string }) {
  const response = await fetch(
    `/api/groups/${groupId}?workspaceId=${workspaceId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holdingPeriodDays,
        ...(applyToAllGroups && { updateHoldingPeriodDaysForAllGroups: true }),
      }),
    },
  );

  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(
      error?.message || "Failed to update payout holding period.",
    );
  }
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
