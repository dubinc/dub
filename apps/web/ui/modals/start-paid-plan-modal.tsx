"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal, useRouterStuff } from "@dub/ui";
import { capitalize, getPlanDetails, isLegacyBusinessPlan } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function StartPaidPlanModal({
  showModal,
  setShowModal,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
}) {
  const {
    id: workspaceId,
    plan,
    planTier = 1,
    payoutsLimit,
    mutate,
  } = useWorkspace();
  const { queryParams } = useRouterStuff();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const planDetails = useMemo(() => {
    if (!plan || plan === "free" || plan === "enterprise") return null;
    return getPlanDetails({ plan, planTier });
  }, [plan, planTier]);

  const planDisplayName = useMemo(() => {
    if (!plan) return "";
    if (isLegacyBusinessPlan({ plan, payoutsLimit })) {
      return "Business (Legacy)";
    }
    return capitalize(plan);
  }, [plan, payoutsLimit]);

  const monthlyPrice = planDetails?.price.monthly;

  const handleConfirm = async () => {
    if (isSubmitting || !workspaceId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/billing/end-trial`,
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
          "Failed to start paid plan. Please try again or use the billing portal.";
        toast.error(message);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        "Failed to start paid plan. Please try again or use the billing portal.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-md"
    >
      <div className="sm:py-4.5 border-b border-neutral-200 px-4 py-3 sm:px-6">
        <h3 className="text-lg font-medium text-neutral-900">
          Plan start confirmation
        </h3>
      </div>

      <div className="flex flex-col gap-4 bg-neutral-50 p-4 sm:p-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-base font-semibold text-neutral-900">
            {planDetails?.name ?? planDisplayName}
          </p>
          {monthlyPrice != null && (
            <div className="mt-1 flex flex-wrap items-baseline gap-1">
              <NumberFlow
                value={monthlyPrice}
                className="text-sm font-medium tabular-nums text-neutral-900"
                format={{
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                }}
              />
              <span className="text-sm text-neutral-500">per month</span>
            </div>
          )}
        </div>
        <p className="text-sm text-neutral-600">
          You&apos;ll be charged today and your trial will end.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-4 py-5 sm:px-6">
        <Button
          variant="secondary"
          className="h-8 rounded-lg px-3 text-sm"
          text="Cancel"
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

export function useStartPaidPlanModal() {
  const [showModal, setShowModal] = useState(false);

  const StartPaidPlanModalCallback = useCallback(() => {
    return (
      <StartPaidPlanModal showModal={showModal} setShowModal={setShowModal} />
    );
  }, [showModal]);

  return useMemo(
    () => ({
      setShowStartPaidPlanModal: setShowModal,
      StartPaidPlanModal: StartPaidPlanModalCallback,
    }),
    [setShowModal, StartPaidPlanModalCallback],
  );
}
