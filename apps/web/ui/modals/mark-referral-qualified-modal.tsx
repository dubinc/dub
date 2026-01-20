"use client";

import { markReferralQualifiedAction } from "@/lib/actions/referrals/mark-referral-qualified";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { ReferralProps } from "@/lib/types";
import { Button, Modal, useKeyboardShortcut } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type ReferralQualifiedFormData = {
  externalId: string;
};

interface ReferralQualifiedModalProps {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  referral: ReferralProps;
  onSubmit: (data: ReferralQualifiedFormData) => Promise<void>;
  isPending: boolean;
  onResetRef: React.MutableRefObject<(() => void) | null>;
}

function ReferralQualifiedModal({
  showModal,
  setShowModal,
  onSubmit,
  isPending,
  onResetRef,
}: ReferralQualifiedModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ReferralQualifiedFormData>({
    defaultValues: {
      externalId: "",
    },
  });

  // Store reset function in ref so parent can call it
  onResetRef.current = reset;

  // Reset form when modal is closed
  useEffect(() => {
    if (!showModal) {
      reset();
    }
  }, [showModal, reset]);

  const handleFormSubmit = handleSubmit(onSubmit);

  // Keyboard shortcuts for modal actions
  useKeyboardShortcut(
    "q",
    (e) => {
      if (showModal && !isPending && !isSubmitting) {
        e.preventDefault();
        handleFormSubmit(e as any);
      }
    },
    { modal: true },
  );

  useKeyboardShortcut(
    "c",
    (e) => {
      if (showModal) {
        e.preventDefault();
        setShowModal(false);
        reset();
      }
    },
    { modal: true },
  );

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <form onSubmit={handleFormSubmit}>
        <div className="flex flex-col gap-1 border-b border-neutral-200 px-[18px] py-5 text-left">
          <h3 className="text-content-emphasis text-base font-semibold">
            Qualify lead
          </h3>
          <p className="text-content-subtle text-sm">
            Are you sure you want to qualify this partner referral?
          </p>
        </div>

        <div className="flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-2">
            <label className="text-content-emphasis block text-sm font-medium">
              External ID (optional)
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="text"
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.externalId &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                placeholder="External customer ID"
                {...register("externalId", {
                  required: false,
                })}
              />
            </div>

            {errors.externalId && (
              <p className="text-xs text-red-600">
                {errors.externalId.message}
              </p>
            )}

            <p className="text-xs text-neutral-500">
              The customer's external ID. If not provided, the referral email
              will be used.
            </p>
          </div>
        </div>

        <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-4">
          <Button
            variant="secondary"
            className="h-8 w-fit px-3"
            text="Cancel"
            shortcut="C"
            onClick={() => {
              setShowModal(false);
              reset();
            }}
          />
          <Button
            type="submit"
            variant="primary"
            className="h-8 w-fit px-3"
            text="Qualify"
            shortcut="Q"
            loading={isPending || isSubmitting}
          />
        </div>
      </form>
    </Modal>
  );
}

export function useMarkReferralQualifiedModal({
  referral,
}: {
  referral: ReferralProps;
}) {
  const { id: workspaceId } = useWorkspace();
  const [showModal, setShowModal] = useState(false);
  const resetFormRef = useRef<(() => void) | null>(null);

  const { executeAsync, isPending } = useAction(markReferralQualifiedAction, {
    onSuccess: async () => {
      toast.success("Partner referral qualified successfully!");
      mutatePrefix("/api/programs/referrals");
      setShowModal(false);
      resetFormRef.current?.();
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = useCallback(
    async (data: ReferralQualifiedFormData) => {
      if (!workspaceId || !referral.id) {
        return;
      }

      await executeAsync({
        workspaceId,
        referralId: referral.id,
        externalId: data.externalId || undefined,
      });
    },
    [executeAsync, referral.id, workspaceId],
  );

  return {
    setShowModal,
    QualifiedModal: (
      <ReferralQualifiedModal
        showModal={showModal}
        setShowModal={setShowModal}
        referral={referral}
        onSubmit={onSubmit}
        isPending={isPending}
        onResetRef={resetFormRef}
      />
    ),
    isMarkingQualified: isPending,
  };
}
