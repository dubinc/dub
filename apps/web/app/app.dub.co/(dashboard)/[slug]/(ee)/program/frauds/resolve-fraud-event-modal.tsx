"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { FraudEventProps } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface ResolveFraudEventFormData {
  resolutionReason: string;
}

function ResolveFraudEventModal({
  showResolveFraudEventModal,
  setShowResolveFraudEventModal,
  fraudEvent,
}: {
  showResolveFraudEventModal: boolean;
  setShowResolveFraudEventModal: Dispatch<SetStateAction<boolean>>;
  fraudEvent: Pick<FraudEventProps, "id" | "partner">;
}) {
  const { makeRequest: resolveFraudEvent, isSubmitting } = useApiMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResolveFraudEventFormData>({
    defaultValues: {
      resolutionReason: "",
    },
  });

  const onSubmit = useCallback(
    async (data: ResolveFraudEventFormData) => {
      if (!fraudEvent.id) {
        return;
      }

      await resolveFraudEvent(`/api/fraud-events/${fraudEvent.id}/resolve`, {
        method: "PATCH",
        body: {
          status: "resolved",
          resolutionReason: data.resolutionReason || undefined,
        },
        onSuccess: () => {
          toast.success("Fraud event resolved");
          setShowResolveFraudEventModal(false);
          mutatePrefix("/api/fraud-events");
        },
      });
    },
    [fraudEvent.id, resolveFraudEvent, setShowResolveFraudEventModal],
  );

  return (
    <Modal
      showModal={showResolveFraudEventModal}
      setShowModal={setShowResolveFraudEventModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Resolve fraud event</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
          <p className="text-sm font-medium text-neutral-800">
            Confirm resolving the fraud event
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
                placeholder="Add notes about why this event is resolved..."
                rows={4}
                {...register("resolutionReason")}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
          <Button
            onClick={() => setShowResolveFraudEventModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 px-3"
          />
          <Button
            type="submit"
            variant="primary"
            text="Resolve"
            disabled={!fraudEvent.id}
            loading={isSubmitting}
            className="h-8 px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useResolveFraudEventModal({
  fraudEvent,
}: {
  fraudEvent: Pick<FraudEventProps, "id" | "partner">;
}) {
  const [showResolveFraudEventModal, setShowResolveFraudEventModal] =
    useState(false);

  const ResolveFraudEventModalCallback = useCallback(() => {
    return (
      <ResolveFraudEventModal
        showResolveFraudEventModal={showResolveFraudEventModal}
        setShowResolveFraudEventModal={setShowResolveFraudEventModal}
        fraudEvent={fraudEvent}
      />
    );
  }, [showResolveFraudEventModal, setShowResolveFraudEventModal, fraudEvent]);

  return useMemo(
    () => ({
      setShowResolveFraudEventModal,
      ResolveFraudEventModal: ResolveFraudEventModalCallback,
    }),
    [setShowResolveFraudEventModal, ResolveFraudEventModalCallback],
  );
}

