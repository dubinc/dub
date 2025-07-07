"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updateProgramAction } from "@/lib/actions/partners/update-program";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { HOLDING_PERIOD_DAYS } from "@/lib/zod/schemas/programs";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type ProgramPayoutSettingsModalProps = {
  showProgramPayoutSettingsModal: boolean;
  setShowProgramPayoutSettingsModal: Dispatch<SetStateAction<boolean>>;
};

type FormData = Pick<ProgramProps, "holdingPeriodDays" | "minPayoutAmount">;

function ProgramPayoutSettingsModal(props: ProgramPayoutSettingsModalProps) {
  const { showProgramPayoutSettingsModal, setShowProgramPayoutSettingsModal } =
    props;

  return (
    <Modal
      showModal={showProgramPayoutSettingsModal}
      setShowModal={setShowProgramPayoutSettingsModal}
    >
      <ProgramPayoutSettingsModalInner {...props} />
    </Modal>
  );
}

function ProgramPayoutSettingsModalInner({
  setShowProgramPayoutSettingsModal,
}: ProgramPayoutSettingsModalProps) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { program } = useProgram();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isDirty, isValid, isSubmitting, errors },
  } = useForm<FormData>({
    mode: "onBlur",
  });

  useEffect(() => {
    if (program) {
      setValue("holdingPeriodDays", program.holdingPeriodDays);
      setValue("minPayoutAmount", program.minPayoutAmount / 100);
    }
  }, [program, setValue]);

  const { executeAsync } = useAction(updateProgramAction, {
    onSuccess: async () => {
      toast.success("Payout settings updated successfully.");
      setShowProgramPayoutSettingsModal(false);
      mutatePrefix(`/api/programs/${defaultProgramId}`);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="border-b border-neutral-200 p-4 sm:px-6">
        <h3 className="text-lg font-medium">Payout settings</h3>
      </div>

      <div className="flex flex-col gap-2 bg-neutral-50 p-4 sm:p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium leading-5 text-neutral-900">
              Holding period
            </label>
            <p className="text-xs text-neutral-500">
              Set the holding period before payouts are released
            </p>
            <div className="relative mt-2 rounded-md shadow-sm">
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

          <div>
            <label className="text-sm font-medium leading-5 text-neutral-900">
              Minimum payout amount
            </label>
            <p className="text-xs text-neutral-500">
              Set the minimum payout amount (optional)
            </p>
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
                  valueAsNumber: true,
                  onChange: handleMoneyInputChange,
                })}
                onKeyDown={handleMoneyKeyDown}
              />

              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                USD
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          variant="secondary"
          text="Cancel"
          disabled={isSubmitting}
          className="h-8 w-fit px-3"
          onClick={() => setShowProgramPayoutSettingsModal(false)}
        />

        <Button
          text="Save"
          className="h-8 w-fit px-3"
          loading={isSubmitting}
          disabled={!isDirty || !isValid}
          type="submit"
        />
      </div>
    </form>
  );
}

export function useProgramPayoutSettingsModal() {
  const [showProgramPayoutSettingsModal, setShowProgramPayoutSettingsModal] =
    useState(false);

  const ProgramPayoutSettingsModalCallback = useCallback(() => {
    return (
      <ProgramPayoutSettingsModal
        showProgramPayoutSettingsModal={showProgramPayoutSettingsModal}
        setShowProgramPayoutSettingsModal={setShowProgramPayoutSettingsModal}
      />
    );
  }, [showProgramPayoutSettingsModal, setShowProgramPayoutSettingsModal]);

  return useMemo(
    () => ({
      setShowProgramPayoutSettingsModal,
      ProgramPayoutSettingsModal: ProgramPayoutSettingsModalCallback,
    }),
    [setShowProgramPayoutSettingsModal, ProgramPayoutSettingsModalCallback],
  );
}
