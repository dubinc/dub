"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal, useRouterStuff } from "@dub/ui";
import {
  getTrialLimitFeaturePhrase,
  isWorkspaceBillingTrialActive,
  type TrialLimitResource,
} from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Colocate `useTrialLimitActivateModal` + `<TrialLimitActivateModal />` where you open the modal.
 *
 * Phrase mapping (`getTrialLimitFeaturePhrase` / `TrialLimitResource`):
 * - links → link builder, import menu, upgrade banner
 * - clicks → program analytics / exceeded-events surfaces, upgrade banner
 * - payouts → upgrade banner when payouts over limit
 * - users → `invite-teammates-form` (API `exceeded_limit` on invites)
 * - partnerEnrollments → partner approve / bulk approve (trial enrollment cap)
 * - networkInvites → partner network invite sheet (weekly invite limit)
 * - dublink / domains → use where domain actions are trial-gated (add at call site)
 */

function TrialLimitActivateModalInner({
  showModal,
  setShowModal,
  limitResource,
}: {
  showModal: boolean;
  setShowModal: (open: boolean) => void;
  limitResource: TrialLimitResource;
}) {
  const { id: workspaceId, plan, trialEndsAt, mutate } = useWorkspace();
  const { queryParams } = useRouterStuff();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const featurePhrase = getTrialLimitFeaturePhrase(limitResource);

  const trialEndLabel =
    trialEndsAt != null && isWorkspaceBillingTrialActive(trialEndsAt)
      ? new Date(trialEndsAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";

  const handleConfirm = async () => {
    if (isSubmitting || !workspaceId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/billing/activate-paid-plan`,
        { method: "POST" },
      );
      if (res.ok) {
        await mutate();
        queryParams({
          set: {
            upgraded: "true",
            plan: plan ?? "pro",
          },
          replace: true,
          scroll: false,
        });
        setShowModal(false);
      } else {
        const body = await res.json().catch(() => null);
        const message =
          body?.error?.message ??
          "Could not end trial. Try again or use the billing portal.";
        toast.error(message);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not end trial. Please try again or use the billing portal.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={(v) =>
        setShowModal(typeof v === "function" ? v(showModal) : v)
      }
      className="max-w-md"
    >
      <div className="sm:py-4.5 border-b border-neutral-200 px-4 py-3 sm:px-6">
        <h3 className="text-lg font-medium text-neutral-900">
          Activate your plan
        </h3>
      </div>

      <div className="flex flex-col gap-4 bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-600">
          You&apos;ve hit a trial limit.
        </p>
        <p className="text-sm text-neutral-600">
          In order to {featurePhrase}, you&apos;ll have to start a paid plan to
          unlock it, or continue your trial until{" "}
          {trialEndLabel || "your trial ends"} with limits.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-4 py-5 sm:px-6">
        <Button
          variant="secondary"
          className="h-8 rounded-lg px-3 text-sm"
          text="Continue trial"
          onClick={() => setShowModal(false)}
          disabled={isSubmitting}
        />
        <Button
          variant="primary"
          className="h-8 rounded-lg px-3 text-sm"
          text="Start paid plan"
          loading={isSubmitting}
          disabled={isSubmitting}
          onClick={handleConfirm}
        />
      </div>
    </Modal>
  );
}

export function useTrialLimitActivateModal() {
  const [showModal, setShowModal] = useState(false);
  const [limitResource, setLimitResource] =
    useState<TrialLimitResource>("links");

  const openTrialLimitModal = useCallback((resource: TrialLimitResource) => {
    setLimitResource(resource);
    setShowModal(true);
  }, []);

  const setShowTrialLimitActivateModal = useCallback(
    (value: boolean | { open: boolean; limitResource: TrialLimitResource }) => {
      if (typeof value === "boolean") {
        setShowModal(value);
      } else {
        setLimitResource(value.limitResource);
        setShowModal(value.open);
      }
    },
    [],
  );

  const TrialLimitActivateModal = useCallback(() => {
    return (
      <TrialLimitActivateModalInner
        showModal={showModal}
        setShowModal={setShowModal}
        limitResource={limitResource}
      />
    );
  }, [showModal, limitResource]);

  return useMemo(
    () => ({
      openTrialLimitModal,
      setShowTrialLimitActivateModal,
      TrialLimitActivateModal,
    }),
    [
      openTrialLimitModal,
      setShowTrialLimitActivateModal,
      TrialLimitActivateModal,
    ],
  );
}
