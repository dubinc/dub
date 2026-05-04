"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal } from "@dub/ui";
import {
  capitalize,
  getPlanDetails,
  isWorkspaceBillingTrialActive,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { ArrowDown } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

type SwitchTrialPlanModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  newPlan: string;
  newPeriod: "monthly" | "yearly";
  newTier?: number;
  onConfirm: () => Promise<void>;
};

function PlanCard({
  label,
  name,
  price,
  period,
}: {
  label: string;
  name: string;
  price: number | null;
  period: "monthly" | "yearly";
}) {
  const billingLabel =
    period === "yearly" ? "per month, billed yearly" : "per month";

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-1 pt-0">
      <h3 className="px-1.5 py-2 text-xs font-medium leading-4 text-neutral-500">
        {label}
      </h3>
      <div className="rounded-lg border border-neutral-200 bg-white p-3">
        <p className="text-base font-semibold leading-none text-neutral-800">
          {name}
        </p>
        {price != null && (
          <div className="mt-1.5 flex items-baseline gap-1">
            <NumberFlow
              value={price}
              className="text-sm font-medium tabular-nums text-neutral-900"
              format={{
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
              }}
            />
            <span className="text-sm text-neutral-500">{billingLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SwitchTrialPlanModal({
  showModal,
  setShowModal,
  newPlan,
  newPeriod,
  newTier = 1,
  onConfirm,
}: SwitchTrialPlanModalProps) {
  const {
    plan: currentPlan,
    planPeriod: currentPlanPeriod,
    planTier: currentPlanTier = 1,
    trialEndsAt,
  } = useWorkspace();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPeriod: "monthly" | "yearly" =
    currentPlanPeriod === "yearly" ? "yearly" : "monthly";

  const currentPlanDetails = useMemo(() => {
    if (!currentPlan || currentPlan === "free" || currentPlan === "enterprise")
      return null;
    return getPlanDetails({ plan: currentPlan, planTier: currentPlanTier });
  }, [currentPlan, currentPlanTier]);

  const newPlanDetails = useMemo(
    () => getPlanDetails({ plan: newPlan, planTier: newTier }),
    [newPlan, newTier],
  );

  const currentPrice = currentPlanDetails?.price?.[currentPeriod] ?? null;
  const newPrice = newPlanDetails?.price?.[newPeriod] ?? null;

  const trialEndDate =
    trialEndsAt && isWorkspaceBillingTrialActive(trialEndsAt)
      ? new Date(trialEndsAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

  const newPlanLabel = newPlanDetails?.name ?? capitalize(newPlan);
  const newPriceBillingLabel =
    newPeriod === "yearly" ? "per month, billed yearly" : "month";

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-md"
    >
      <div className="flex items-center gap-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Switch trial plan</h3>
      </div>

      <div className="flex flex-col gap-2 bg-neutral-50 p-4 sm:p-6">
        <div className="flex flex-col gap-3">
          <PlanCard
            label="Current plan"
            name={
              currentPlanDetails?.name ?? capitalize(currentPlan ?? "") ?? ""
            }
            price={currentPrice}
            period={currentPeriod}
          />

          <ArrowDown
            className="ml-7 size-5 text-neutral-400"
            aria-hidden="true"
          />

          <PlanCard
            label="New plan"
            name={newPlanLabel}
            price={newPrice}
            period={newPeriod}
          />
        </div>

        <p className="mt-2 text-sm text-neutral-600">
          Your trial will continue on the{" "}
          <span className="font-semibold text-neutral-900">
            {newPlanLabel} plan
          </span>
          {trialEndDate && newPrice != null ? (
            <>
              , and you&apos;ll be charged{" "}
              <span className="font-semibold text-neutral-900">
                <NumberFlow
                  value={newPrice}
                  className="inline tabular-nums"
                  format={{
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 0,
                  }}
                />
                /{newPriceBillingLabel}
              </span>{" "}
              starting{" "}
              <span className="font-semibold text-neutral-900">
                {trialEndDate}
              </span>
            </>
          ) : (
            <>, and you&apos;ll be charged the new rate when your trial ends</>
          )}
          .
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
          text="Switch plan"
          loading={isSubmitting}
          onClick={async () => {
            if (isSubmitting) return;
            setIsSubmitting(true);
            try {
              await onConfirm();
              setShowModal(false);
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      </div>
    </Modal>
  );
}

export function useSwitchTrialPlanModal({
  newPlan,
  newPeriod,
  newTier,
  onConfirm,
}: {
  newPlan: string;
  newPeriod: "monthly" | "yearly";
  newTier?: number;
  onConfirm: () => Promise<void>;
}) {
  const [showModal, setShowModal] = useState(false);

  // Ref keeps the modal wrapper callback stable when the parent re-renders with a
  // new onConfirm (e.g. performUpgrade) so inner state like isSubmitting is not reset.
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const SwitchTrialPlanModalCallback = useCallback(() => {
    return (
      <SwitchTrialPlanModal
        showModal={showModal}
        setShowModal={setShowModal}
        newPlan={newPlan}
        newPeriod={newPeriod}
        newTier={newTier}
        onConfirm={() => onConfirmRef.current()}
      />
    );
  }, [showModal, newPlan, newPeriod, newTier]);

  return useMemo(
    () => ({
      setShowSwitchTrialPlanModal: setShowModal,
      SwitchTrialPlanModal: SwitchTrialPlanModalCallback,
    }),
    [setShowModal, SwitchTrialPlanModalCallback],
  );
}
