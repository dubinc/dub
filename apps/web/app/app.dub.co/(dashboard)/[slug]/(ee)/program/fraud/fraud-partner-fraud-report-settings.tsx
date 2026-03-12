"use client";

import { UpdateFraudRuleSettings } from "@/lib/types";
import { Switch } from "@dub/ui";
import { useFormContext } from "react-hook-form";

interface FraudPartnerFraudReportSettingsProps {
  isConfigLoading?: boolean;
}

export function FraudPartnerFraudReportSettings({
  isConfigLoading = false,
}: FraudPartnerFraudReportSettingsProps) {
  const {
    watch,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<UpdateFraudRuleSettings>();

  const enabled = watch("partnerFraudReport.enabled");
  const isDisabled = isConfigLoading || isSubmitting;

  return (
    <div className="rounded-xl border border-neutral-200">
      <div className="flex items-center justify-between p-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            Fraud report
          </h3>
          <p className="text-content-subtle mt-0.5 text-xs font-normal tracking-normal">
            Flag partners rejected from other programs for suspected fraud
          </p>
        </div>
        <Switch
          trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
          checked={enabled}
          disabled={isDisabled}
          fn={(enabled: boolean) => {
            setValue("partnerFraudReport.enabled", enabled, {
              shouldDirty: true,
            });
          }}
        />
      </div>
    </div>
  );
}
