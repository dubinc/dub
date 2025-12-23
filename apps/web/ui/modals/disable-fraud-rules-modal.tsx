"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudRuleProps, UpdateFraudRuleSettings } from "@/lib/types";
import { Badge, Button, Modal } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";

export const CONFIGURABLE_RULE_TYPES = [
  "referralSourceBanned",
  "paidTrafficDetected",
] as const;

export type ConfigurableRuleType = (typeof CONFIGURABLE_RULE_TYPES)[number];

const RULE_DETAILS: Record<
  ConfigurableRuleType,
  { title: string; description: string }
> = {
  referralSourceBanned: {
    title: "Referral source",
    description: "Flag specific domains for referral traffic",
  },
  paidTrafficDetected: {
    title: "Paid traffic",
    description: "Flag paid advertising traffic",
  },
};

interface DisableFraudRulesModalProps {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function DisableFraudRulesModal({
  showModal,
  setShowModal,
  setIsOpen,
}: DisableFraudRulesModalProps) {
  const { id: workspaceId } = useWorkspace();
  const { isSubmitting, makeRequest } = useApiMutation();

  const { data: fraudRules, isLoading } = useSWR<FraudRuleProps[]>(
    workspaceId ? `/api/fraud/rules?workspaceId=${workspaceId}` : null,
    fetcher,
  );

  const { watch, setValue, getValues } =
    useFormContext<UpdateFraudRuleSettings>();

  const formValues = watch();

  const rulesBeingDisabled = getRulesBeingDisabled({
    previousFraudRules: fraudRules,
    nextFraudRules: formValues,
  });

  const handleConfirm = async () => {
    // Form values are already updated via setValue in checkbox onChange
    const body = getValues();

    await makeRequest("/api/fraud/rules", {
      method: "PATCH",
      body,
      onSuccess: () => {
        toast.success("Fraud settings updated successfully.");
        setIsOpen(false);
        mutatePrefix("/api/fraud/rules");
      },
    });

    setShowModal(false);
  };

  const handleCancel = () => {
    // Reset resolvePendingEvents to false for rules being disabled
    rulesBeingDisabled.forEach((ruleType) => {
      const rule = formValues[ruleType];

      if (rule) {
        setValue(ruleType, {
          ...rule,
          resolvePendingEvents: false,
        });
      }
    });

    setShowModal(false);
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="p-5 text-left">
        <h3 className="text-content-emphasis text-base font-semibold">
          Confirm disabling rules
        </h3>
        <div className="text-content-subtle mt-1 text-sm">
          Are you sure you want to disable these rules?
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="space-y-4">
          {rulesBeingDisabled.map((ruleType) => {
            const { title, description } = RULE_DETAILS[ruleType];

            return (
              <div
                key={ruleType}
                className="divide-y divide-neutral-200 rounded-xl border border-neutral-200"
              >
                <div className="p-3">
                  <h4 className="text-sm font-semibold text-neutral-900">
                    {title}
                  </h4>
                  <p className="text-content-subtle mt-0.5 text-xs font-normal tracking-normal">
                    {description}
                  </p>
                </div>
                <div className="flex items-center gap-2 p-3">
                  <input
                    type="checkbox"
                    id={ruleType}
                    className="h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                    checked={
                      formValues[ruleType]?.resolvePendingEvents ?? false
                    }
                    disabled={isLoading}
                    onChange={(e) => {
                      const rule = formValues[ruleType];

                      if (rule) {
                        setValue(ruleType, {
                          ...rule,
                          resolvePendingEvents: e.target.checked,
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor={ruleType}
                    className="flex items-center gap-1 text-sm text-neutral-900"
                  >
                    <span>Mark all pending events for this rule as</span>
                    <Badge
                      variant="gray"
                      className="rounded-md border-none text-xs font-semibold text-neutral-700"
                    >
                      Resolved
                    </Badge>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-4">
        <Button
          variant="secondary"
          className="h-8 w-fit px-3"
          text="Cancel"
          onClick={handleCancel}
          disabled={isLoading || isSubmitting}
        />
        <Button
          variant="primary"
          className="h-8 w-fit px-3"
          text="Disable"
          onClick={handleConfirm}
          disabled={isLoading || isSubmitting}
          loading={isSubmitting}
        />
      </div>
    </Modal>
  );
}

// Detects which fraud rules are being disabled by comparing previous (API) state
// with next (form) state.
export function getRulesBeingDisabled({
  previousFraudRules,
  nextFraudRules,
}: {
  previousFraudRules: FraudRuleProps[] | undefined;
  nextFraudRules: UpdateFraudRuleSettings;
}): ConfigurableRuleType[] {
  // Build "previous" map from API
  const previous: Record<ConfigurableRuleType, boolean> = {
    referralSourceBanned:
      previousFraudRules?.find((r) => r.type === "referralSourceBanned")
        ?.enabled ?? false,
    paidTrafficDetected:
      previousFraudRules?.find((r) => r.type === "paidTrafficDetected")
        ?.enabled ?? false,
  };

  // Build "next" map from form
  const next: Record<ConfigurableRuleType, boolean> = {
    referralSourceBanned: nextFraudRules.referralSourceBanned?.enabled ?? false,
    paidTrafficDetected: nextFraudRules.paidTrafficDetected?.enabled ?? false,
  };

  // Detect rule disable transitions
  return CONFIGURABLE_RULE_TYPES.filter(
    (type) => previous[type] && !next[type],
  );
}

export function useDisableFraudRulesModal({
  setIsOpen,
}: {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [showDisableModal, setShowDisableModal] = useState(false);

  const close = () => {
    setShowDisableModal(false);
  };

  return {
    setShowDisableModal,
    DisableFraudRulesModal: (
      <DisableFraudRulesModal
        showModal={showDisableModal}
        setShowModal={close}
        setIsOpen={setIsOpen}
      />
    ),
  };
}
