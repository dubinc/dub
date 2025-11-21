"use client";

import { resolveFraudEventsAction } from "@/lib/actions/fraud/resolve-fraud-events";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudEventProps } from "@/lib/types";
import {
  MAX_RESOLUTION_REASON_LENGTH,
  resolveFraudEventsSchema,
} from "@/lib/zod/schemas/fraud";
import { MaxCharactersCounter } from "@/ui/shared/max-characters-counter";
import { Button, Modal } from "@dub/ui";
import { cn, OG_AVATAR_URL, pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type FormData = z.infer<typeof resolveFraudEventsSchema>;

function ResolveFraudEventsModal({
  showResolveFraudEventModal,
  setShowResolveFraudEventModal,
  fraudEvent,
}: {
  showResolveFraudEventModal: boolean;
  setShowResolveFraudEventModal: Dispatch<SetStateAction<boolean>>;
  fraudEvent: FraudEventProps;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isPending } = useAction(resolveFraudEventsAction, {
    onSuccess: () => {
      toast.success("Fraud event resolved.");
      setShowResolveFraudEventModal(false);
      mutatePrefix("/api/fraud-events");
    },
    onError: ({ error }) => {
      console.log(error);
      toast.error(error.serverError);
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      resolutionReason: "",
      groupKey: fraudEvent.groupKey,
    },
  });

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!workspaceId || !fraudEvent.groupKey) {
        return;
      }

      await executeAsync({
        workspaceId,
        groupKey: fraudEvent.groupKey,
        resolutionReason: data.resolutionReason,
      });
    },
    [fraudEvent, workspaceId, executeAsync],
  );

  return (
    <Modal
      showModal={showResolveFraudEventModal}
      setShowModal={setShowResolveFraudEventModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Resolve events</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
          {fraudEvent.partner && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
              <div className="flex items-center gap-4">
                <img
                  src={`${OG_AVATAR_URL}${fraudEvent.partner.name || "Unknown"}`}
                  alt={fraudEvent.partner.name || "Unknown"}
                  className="size-10 rounded-full bg-white"
                />
                <div className="flex min-w-0 flex-col">
                  <h4 className="truncate text-sm font-medium text-neutral-900">
                    {fraudEvent.partner.name || "Unknown"}
                  </h4>
                  {fraudEvent.partner.email && (
                    <p className="truncate text-xs text-neutral-500">
                      {fraudEvent.partner.email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="resolutionReason"
                className="block text-sm font-medium text-neutral-900"
              >
                Internal notes (optional)
              </label>
              <MaxCharactersCounter
                name="resolutionReason"
                maxLength={MAX_RESOLUTION_REASON_LENGTH}
                control={control}
              />
            </div>
            <div className="relative mt-1.5 rounded-md shadow-sm">
              <textarea
                id="resolutionReason"
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.resolutionReason && "border-red-600",
                )}
                placeholder="Add notes about why events are resolved..."
                rows={3}
                maxLength={MAX_RESOLUTION_REASON_LENGTH}
                {...register("resolutionReason")}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
          <Button
            onClick={() => setShowResolveFraudEventModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            disabled={isPending}
          />
          <Button
            type="submit"
            variant="primary"
            text={`Resolve ${fraudEvent.count} ${pluralize("event", fraudEvent.count)}`}
            disabled={!fraudEvent.id || !fraudEvent.partner}
            loading={isPending}
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useResolveFraudEventsModal({
  fraudEvent,
}: {
  fraudEvent: FraudEventProps;
}) {
  const [showResolveFraudEventModal, setShowResolveFraudEventModal] =
    useState(false);

  const ResolveFraudEventModalCallback = useCallback(() => {
    return (
      <ResolveFraudEventsModal
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
