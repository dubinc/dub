"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updateProgramAction } from "@/lib/actions/partners/update-program";
import { ALLOWED_MIN_PAYOUT_AMOUNTS } from "@/lib/partners/constants";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { HOLDING_PERIOD_DAYS } from "@/lib/zod/schemas/programs";
import { Button, Modal, Slider, useScrollProgress } from "@dub/ui";
import NumberFlow from "@number-flow/react";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
    watch,
    setValue,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onBlur",
  });

  useEffect(() => {
    if (program) {
      setValue("holdingPeriodDays", program.holdingPeriodDays);
      setValue("minPayoutAmount", program.minPayoutAmount);
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

  const minPayoutAmount = watch("minPayoutAmount");

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Payout settings</h3>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={updateScrollProgress}
          className="scrollbar-hide max-h-[calc(100dvh-200px)] space-y-10 overflow-y-auto bg-neutral-50 p-4 sm:p-6"
        >
          {/* Payout holding period */}
          <div className="space-y-6">
            <div>
              <h4 className="text-base font-semibold leading-6 text-neutral-900">
                Payout holding period
              </h4>
              <p className="text-sm font-medium text-neutral-500">
                Set how long to hold funds before they can be withdrawn.
              </p>
            </div>
            <div>
              <div className="relative rounded-md shadow-sm">
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
          </div>

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
                  });
                }}
                marks={ALLOWED_MIN_PAYOUT_AMOUNTS}
              />
            </div>
          </div>
        </div>
        <div
          className="pointer-events-none absolute -bottom-px left-0 h-16 w-full rounded-b-lg bg-gradient-to-t from-white sm:bottom-0"
          style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
        />
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
