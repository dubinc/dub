"use client";

import { FRAUD_SEVERITY_CONFIG } from "@/lib/api/fraud/constants";
import { FraudRuleInfo, FraudSeverity } from "@/lib/types";
import { Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { X } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { PartnerApplicationFraudSeverityIndicator } from "./partner-application-fraud-severity-indicator";

interface PartnerApplicationRiskSummaryModalProps {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  triggeredRules: FraudRuleInfo[];
  severity: FraudSeverity | null;
}

function PartnerApplicationRiskSummaryModal({
  showModal,
  setShowModal,
  triggeredRules,
  severity,
}: PartnerApplicationRiskSummaryModalProps) {
  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-lg"
    >
      <div className="border-b border-neutral-200 px-4 py-3">
        <div className="flex w-full items-center justify-between">
          <h3 className="text-lg font-medium leading-none">Risk analysis</h3>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="group rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 bg-white p-4 sm:p-6">
        <PartnerApplicationFraudSeverityIndicator severity={severity} />

        <ul className="space-y-4">
          {triggeredRules.map((rule) => {
            if (!rule.severity) return null;

            return (
              <li key={rule.type} className="flex items-start gap-2">
                <div
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    FRAUD_SEVERITY_CONFIG[rule.severity].bg,
                  )}
                />
                <div className="flex flex-col gap-1">
                  <span className="-mt-0.5 text-xs font-medium leading-none text-neutral-700">
                    {rule.name}
                  </span>
                  <p className="text-content-subtle text-xs font-normal leading-4">
                    {rule.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}

export function usePartnerApplicationRiskSummaryModal({
  triggeredRules,
  severity,
}: {
  triggeredRules: FraudRuleInfo[];
  severity: FraudSeverity | null;
}) {
  const [showModal, setShowModal] = useState(false);

  const PartnerApplicationRiskSummaryModalCallback = useCallback(() => {
    return (
      <PartnerApplicationRiskSummaryModal
        showModal={showModal}
        setShowModal={setShowModal}
        triggeredRules={triggeredRules}
        severity={severity}
      />
    );
  }, [showModal, setShowModal, triggeredRules, severity]);

  return useMemo(
    () => ({
      setShowModal,
      PartnerApplicationRiskSummaryModal:
        PartnerApplicationRiskSummaryModalCallback,
    }),
    [setShowModal, PartnerApplicationRiskSummaryModalCallback],
  );
}
