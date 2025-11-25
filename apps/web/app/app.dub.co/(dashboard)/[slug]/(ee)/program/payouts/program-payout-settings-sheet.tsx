"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updateProgramAction } from "@/lib/actions/partners/update-program";
import { ALLOWED_MIN_PAYOUT_AMOUNTS } from "@/lib/constants/payouts";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { X } from "@/ui/shared/icons";
import { Button, Sheet, Slider } from "@dub/ui";
import NumberFlow from "@number-flow/react";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
  const params = useParams<{ slug: string }>();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onBlur",
  });

  useEffect(() => {
    if (program) {
      setValue("minPayoutAmount", program.minPayoutAmount);
    }
  }, [program, setValue]);

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
        <div className="grid gap-3 pb-6">
          <div>
            <h4 className="text-base font-semibold leading-6 text-neutral-900">
              Payout holding period
            </h4>
            <p className="text-sm font-medium text-neutral-500">
              The payout holding period is now configurable on a group level.
            </p>
          </div>
          <a
            href={`/${params.slug}/program/groups/${DEFAULT_PARTNER_GROUP.slug}/settings`}
            target="_blank"
          >
            <Button
              type="button"
              variant="secondary"
              text="View default group settings ↗"
              className="h-8 w-full px-3"
            />
          </a>
        </div>

        {/* Minimum payout amount */}
        <div className="space-y-6 py-6">
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
