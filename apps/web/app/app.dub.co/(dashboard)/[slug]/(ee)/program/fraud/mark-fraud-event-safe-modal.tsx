"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { FraudEventProps } from "@/lib/types";
import { Button, Checkbox, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

interface MarkFraudEventSafeFormData {
  resolutionReason: string;
  markPartnerAsTrusted: boolean;
}

function MarkFraudEventSafeModal({
  showMarkFraudEventSafeModal,
  setShowMarkFraudEventSafeModal,
  fraudEvent,
}: {
  showMarkFraudEventSafeModal: boolean;
  setShowMarkFraudEventSafeModal: Dispatch<SetStateAction<boolean>>;
  fraudEvent: Pick<FraudEventProps, "id" | "partner">;
}) {
  const { makeRequest: resolveFraudEvent, isSubmitting } = useApiMutation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MarkFraudEventSafeFormData>({
    defaultValues: {
      resolutionReason: "",
      markPartnerAsTrusted: false,
    },
  });

  const onSubmit = useCallback(
    async (data: MarkFraudEventSafeFormData) => {
      if (!fraudEvent.id) {
        return;
      }

      await resolveFraudEvent(`/api/fraud-events/${fraudEvent.id}/resolve`, {
        method: "PATCH",
        body: {
          status: "safe",
          resolutionReason: data.resolutionReason || undefined,
          markPartnerAsTrusted: data.markPartnerAsTrusted,
        },
        onSuccess: () => {
          toast.success("Fraud event marked as safe");
          setShowMarkFraudEventSafeModal(false);
          mutatePrefix("/api/fraud-events");
        },
      });
    },
    [fraudEvent.id, resolveFraudEvent, setShowMarkFraudEventSafeModal],
  );

  const partner = fraudEvent.partner;

  return (
    <Modal
      showModal={showMarkFraudEventSafeModal}
      setShowModal={setShowMarkFraudEventSafeModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Mark event as safe</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
          <p className="text-sm font-medium text-neutral-800">
            Confirm marking the event as safe
          </p>

          <div>
            <label
              htmlFor="resolutionReason"
              className="text-content-emphasis block text-sm font-medium"
            >
              Notes <span className="text-neutral-500">(Optional)</span>
            </label>
            <div className="relative mt-1.5 rounded-md shadow-sm">
              <textarea
                id="resolutionReason"
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.resolutionReason && "border-red-600",
                )}
                placeholder="Add notes about why this event is safe..."
                rows={4}
                {...register("resolutionReason")}
              />
            </div>
          </div>

          <div>
            <Controller
              control={control}
              name="markPartnerAsTrusted"
              render={({ field }) => (
                <div className="flex gap-2">
                  <Checkbox
                    id="markPartnerAsTrusted"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <label
                    htmlFor="markPartnerAsTrusted"
                    className="text-content-emphasis select-none text-sm font-normal leading-none"
                  >
                    Mark partner as trusted (ignore all future fraud and risk
                    alerts for this partner)
                  </label>
                </div>
              )}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
          <Button
            onClick={() => setShowMarkFraudEventSafeModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 px-3"
          />
          <Button
            type="submit"
            variant="primary"
            text="Mark as safe"
            disabled={!fraudEvent.id}
            loading={isSubmitting}
            className="h-8 px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useMarkFraudEventSafeModal({
  fraudEvent,
}: {
  fraudEvent: Pick<FraudEventProps, "id" | "partner">;
}) {
  const [showMarkFraudEventSafeModal, setShowMarkFraudEventSafeModal] =
    useState(false);

  const MarkFraudEventSafeModalCallback = useCallback(() => {
    return (
      <MarkFraudEventSafeModal
        showMarkFraudEventSafeModal={showMarkFraudEventSafeModal}
        setShowMarkFraudEventSafeModal={setShowMarkFraudEventSafeModal}
        fraudEvent={fraudEvent}
      />
    );
  }, [showMarkFraudEventSafeModal, setShowMarkFraudEventSafeModal, fraudEvent]);

  return useMemo(
    () => ({
      setShowMarkFraudEventSafeModal,
      MarkFraudEventSafeModal: MarkFraudEventSafeModalCallback,
    }),
    [setShowMarkFraudEventSafeModal, MarkFraudEventSafeModalCallback],
  );
}
