"use client";

import {
  CONFIGURABLE_FRAUD_RULES,
  FRAUD_RULES_BY_TYPE,
} from "@/lib/api/fraud/constants";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  FraudRuleInfo,
  FraudRuleProps,
  PaidTrafficPlatform,
  UpdateFraudRuleSettings,
} from "@/lib/types";
import {
  getRulesBeingDisabled,
  useDisableRiskRulesModal,
} from "@/ui/modals/disable-fraud-rules-modal";
import { X } from "@/ui/shared/icons";
import { Button, InfoTooltip, Sheet } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";
import { RiskPaidTrafficSettings } from "./risk-paid-traffic-settings";
import { RiskReferralSourceSettings } from "./risk-referral-source-settings";
import { RiskRuleToggleSettings } from "./risk-rule-toggle-settings";

// Rules that have dedicated settings components with complex config UI
const RULES_WITH_CUSTOM_UI = new Set([
  "paidTrafficDetected",
  "referralSourceBanned",
]);

// Toggle-only rules rendered via the generic RiskRuleToggleSettings component
const TOGGLE_ONLY_RULES = CONFIGURABLE_FRAUD_RULES.filter(
  (rule): rule is FraudRuleInfo & { type: keyof UpdateFraudRuleSettings } =>
    !RULES_WITH_CUSTOM_UI.has(rule.type),
);

interface RiskRulesSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function RiskRulesSheetContent({ setIsOpen }: RiskRulesSheetProps) {
  const { id: workspaceId } = useWorkspace();
  const { isSubmitting, makeRequest } = useApiMutation();

  const { data: fraudRules, isLoading } = useSWR<FraudRuleProps[]>(
    workspaceId ? `/api/fraud/rules?workspaceId=${workspaceId}` : null,
    fetcher,
  );

  const { setShowDisableModal, DisableRiskRulesModal } =
    useDisableRiskRulesModal({ setIsOpen });

  const form = useForm<UpdateFraudRuleSettings>({
    defaultValues: {
      referralSourceBanned: {
        enabled: false,
        config: { domains: [] },
      },
      paidTrafficDetected: {
        enabled: false,
        config: { platforms: [], google: { whitelistedCampaignIds: [] } },
      },
      ...Object.fromEntries(
        TOGGLE_ONLY_RULES.map((rule) => [rule.type, { enabled: true }]),
      ),
    },
  });

  const {
    handleSubmit,
    formState: { isDirty },
  } = form;

  useEffect(() => {
    if (!fraudRules) return;

    const findRule = (type: string) =>
      fraudRules.find((rule) => rule.type === type);

    const paidTrafficDetectedRule = findRule("paidTrafficDetected");
    const referralSourceBannedRule = findRule("referralSourceBanned");

    const paidTrafficConfig = (paidTrafficDetectedRule?.config ?? {}) as {
      platforms?: PaidTrafficPlatform[];
      google?: { whitelistedCampaignIds?: string[] };
    };

    form.reset({
      referralSourceBanned: {
        enabled: referralSourceBannedRule?.enabled ?? false,
        config: referralSourceBannedRule?.config ?? { domains: [] },
      },
      paidTrafficDetected: {
        enabled: paidTrafficDetectedRule?.enabled ?? false,
        config: {
          platforms: paidTrafficConfig.platforms ?? [],
          google: {
            whitelistedCampaignIds:
              paidTrafficConfig.google?.whitelistedCampaignIds ?? [],
          },
        },
      },
      ...Object.fromEntries(
        TOGGLE_ONLY_RULES.map((rule) => [
          rule.type,
          { enabled: findRule(rule.type)?.enabled ?? true },
        ]),
      ),
    });
  }, [fraudRules, form]);

  // Submit form data to API
  const submitForm = async (body: UpdateFraudRuleSettings) => {
    await makeRequest("/api/fraud/rules", {
      method: "PATCH",
      body,
      onSuccess: () => {
        toast.success("Risk rules updated successfully.");
        setIsOpen(false);
        mutatePrefix(["/api/fraud/rules", "/api/fraud/events"]);
      },
    });
  };

  // Handle form submission
  const onSubmit = async (body: UpdateFraudRuleSettings) => {
    if (isLoading) {
      return;
    }

    // First submit if no previous data exists
    if (!fraudRules) {
      await submitForm(body);
      return;
    }

    // Detect rule disable transitions
    const rulesBeingDisabled = getRulesBeingDisabled({
      previousFraudRules: fraudRules,
      nextFraudRules: body,
    });

    // If any rules are being disabled, show confirmation modal
    if (rulesBeingDisabled.length > 0) {
      setShowDisableModal(true);
      return;
    }

    // Otherwise, submit directly
    await submitForm(body);
  };

  return (
    <>
      <FormProvider {...form}>
        {DisableRiskRulesModal}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex h-full flex-col"
        >
          <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
            <div className="flex h-16 items-center justify-between px-6 py-4">
              <Sheet.Title className="flex items-center gap-2 text-lg font-semibold">
                Risk rules
                <InfoTooltip content="Learn more about how to [customize your program's risk rules](https://dub.co/help/article/risk-monitoring)." />
              </Sheet.Title>
              <Sheet.Close asChild>
                <Button
                  variant="outline"
                  icon={<X className="size-5" />}
                  className="h-auto w-fit p-1"
                />
              </Sheet.Close>
            </div>
          </div>

          <div className="h-full overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4">
              {TOGGLE_ONLY_RULES.map((rule) => (
                <RiskRuleToggleSettings
                  key={rule.type}
                  ruleType={rule.type}
                  title={FRAUD_RULES_BY_TYPE[rule.type].name}
                  description={FRAUD_RULES_BY_TYPE[rule.type].description}
                  isConfigLoading={isLoading}
                />
              ))}
              <RiskPaidTrafficSettings isConfigLoading={isLoading} />
              <RiskReferralSourceSettings isConfigLoading={isLoading} />
            </div>
          </div>

          <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
            <div className="flex items-center justify-end gap-2 p-5">
              <Button
                variant="secondary"
                text="Cancel"
                disabled={isSubmitting}
                className="h-8 w-fit px-3"
                onClick={() => setIsOpen(false)}
              />

              <Button
                type="submit"
                text="Save"
                className="h-8 w-fit px-3"
                loading={isSubmitting}
                disabled={!isDirty || isLoading}
              />
            </div>
          </div>
        </form>
      </FormProvider>
    </>
  );
}

function RiskRulesSheet({
  isOpen,
  ...rest
}: RiskRulesSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <RiskRulesSheetContent {...rest} />
    </Sheet>
  );
}

export function useRiskRulesSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    riskRulesSheet: <RiskRulesSheet setIsOpen={setIsOpen} isOpen={isOpen} />,
    setIsOpen,
  };
}
