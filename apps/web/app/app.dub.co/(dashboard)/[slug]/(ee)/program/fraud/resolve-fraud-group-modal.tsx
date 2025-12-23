"use client";

import { resolveFraudGroupAction } from "@/lib/actions/fraud/resolve-fraud-group";
import { parseActionError } from "@/lib/actions/parse-action-errors";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudGroupProps } from "@/lib/types";
import {
  MAX_RESOLUTION_REASON_LENGTH,
  resolveFraudGroupSchema,
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

type FormData = z.infer<typeof resolveFraudGroupSchema>;

function ResolveFraudGroupModal({
  showResolveFraudGroupModal,
  setShowResolveFraudGroupModal,
  fraudGroup,
  onConfirm,
}: {
  showResolveFraudGroupModal: boolean;
  setShowResolveFraudGroupModal: Dispatch<SetStateAction<boolean>>;
  fraudGroup: FraudGroupProps;
  onConfirm?: () => Promise<void>;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isPending } = useAction(resolveFraudGroupAction, {
    onSuccess: async () => {
      toast.success("Fraud events resolved.");
      setShowResolveFraudGroupModal(false);
      await onConfirm?.();
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
      groupId: fraudGroup.id,
    },
  });

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!workspaceId || !fraudGroup.id) {
        return;
      }

      await executeAsync({
        workspaceId,
        groupId: fraudGroup.id,
        resolutionReason: data.resolutionReason,
      });
    },
    [executeAsync, fraudGroup.id, workspaceId],
  );

  const { partner } = fraudGroup;

  return (
    <Modal
      showModal={showResolveFraudGroupModal}
      setShowModal={setShowResolveFraudGroupModal}
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
                  src={partner.image || `${OG_AVATAR_URL}${partner.id}`}
                  alt={partner.id}
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
            onClick={() => setShowResolveFraudGroupModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            disabled={isPending}
          />
          <Button
            type="submit"
            variant="primary"
            text={`Resolve ${fraudGroup.eventCount} ${pluralize("event", fraudGroup.eventCount)}`}
            disabled={!workspaceId || !fraudGroup.id}
            loading={isPending}
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useResolveFraudGroupModal({
  fraudGroup,
  onConfirm,
}: {
  fraudGroup: FraudGroupProps;
  onConfirm?: () => Promise<void>;
}) {
  const [showResolveFraudGroupModal, setShowResolveFraudGroupModal] =
    useState(false);

  const ResolveFraudGroupModalComponent = useMemo(
    () => (
      <ResolveFraudGroupModal
        showResolveFraudGroupModal={showResolveFraudGroupModal}
        setShowResolveFraudGroupModal={setShowResolveFraudGroupModal}
        fraudGroup={fraudGroup}
        onConfirm={onConfirm}
      />
    ),
    [
      showResolveFraudGroupModal,
      setShowResolveFraudGroupModal,
      fraudGroup,
      onConfirm,
    ],
  );

  return useMemo(
    () => ({
      setShowResolveFraudGroupModal,
      ResolveFraudGroupModal: ResolveFraudGroupModalComponent,
    }),
    [setShowResolveFraudGroupModal, ResolveFraudGroupModalComponent],
  );
}
