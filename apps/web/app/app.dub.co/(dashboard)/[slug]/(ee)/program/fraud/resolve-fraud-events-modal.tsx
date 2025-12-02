"use client";

import { resolveFraudGroupAction } from "@/lib/actions/fraud/resolve-fraud-event-group";
import { parseActionError } from "@/lib/actions/parse-action-errors";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { fraudEventGroupProps } from "@/lib/types";
import {
  MAX_RESOLUTION_REASON_LENGTH,
  resolveFraudEventGroupSchema,
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

type FormData = z.infer<typeof resolveFraudEventGroupSchema>;

function ResolveFraudEventsModal({
  showResolveFraudEventModal,
  setShowResolveFraudEventModal,
  fraudEventGroup,
  onConfirm,
}: {
  showResolveFraudEventModal: boolean;
  setShowResolveFraudEventModal: Dispatch<SetStateAction<boolean>>;
  fraudEventGroup: fraudEventGroupProps;
  onConfirm?: () => void;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isPending } = useAction(resolveFraudGroupAction, {
    onSuccess: () => {
      toast.success("Fraud events resolved.");
      setShowResolveFraudEventModal(false);
      mutatePrefix("/api/fraud/groups");
      onConfirm?.();
    },
    onError: ({ error }) => {
      toast.error(parseActionError(error, "Failed to resolve fraud events."));
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
      groupId: fraudEventGroup.id,
    },
  });

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!workspaceId || !fraudEventGroup.id) {
        return;
      }

      await executeAsync({
        workspaceId,
        groupId: fraudEventGroup.id,
        resolutionReason: data.resolutionReason,
      });
    },
    [fraudEventGroup, workspaceId, executeAsync],
  );

  const { partner } = fraudEventGroup;

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
          {partner && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
              <div className="flex items-center gap-4">
                <img
                  src={`${OG_AVATAR_URL}${partner.name || "Unknown"}`}
                  alt={partner.name || "Unknown"}
                  className="size-10 rounded-full bg-white"
                />
                <div className="flex min-w-0 flex-col">
                  <h4 className="truncate text-sm font-medium text-neutral-900">
                    {partner.name || "Unknown"}
                  </h4>
                  {partner.email && (
                    <p className="truncate text-xs text-neutral-500">
                      {partner.email}
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
            text={`Resolve ${fraudEventGroup.eventCount} ${pluralize("event", fraudEventGroup.eventCount)}`}
            disabled={!workspaceId || !fraudEventGroup.id}
            loading={isPending}
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useResolveFraudEventsModal({
  fraudEventGroup,
  onConfirm,
}: {
  fraudEventGroup: fraudEventGroupProps;
  onConfirm?: () => void;
}) {
  const [showResolveFraudEventModal, setShowResolveFraudEventModal] =
    useState(false);

  const ResolveFraudEventModalCallback = useCallback(() => {
    return (
      <ResolveFraudEventsModal
        showResolveFraudEventModal={showResolveFraudEventModal}
        setShowResolveFraudEventModal={setShowResolveFraudEventModal}
        fraudEventGroup={fraudEventGroup}
        onConfirm={onConfirm}
      />
    );
  }, [
    showResolveFraudEventModal,
    setShowResolveFraudEventModal,
    fraudEventGroup,
    onConfirm,
  ]);

  return useMemo(
    () => ({
      setShowResolveFraudEventModal,
      ResolveFraudEventModal: ResolveFraudEventModalCallback,
    }),
    [setShowResolveFraudEventModal, ResolveFraudEventModalCallback],
  );
}
