"use client";

import { UpdateFraudRuleSettings } from "@/lib/types";
import { Switch } from "@dub/ui";
import { useFormContext } from "react-hook-form";

interface FraudPartnerDuplicatePayoutMethodSettingsProps {
  isConfigLoading?: boolean;
}

export function FraudPartnerDuplicatePayoutMethodSettings({
  isConfigLoading = false,
}: FraudPartnerDuplicatePayoutMethodSettingsProps) {
  const {
    watch,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<UpdateFraudRuleSettings>();

  const enabled = watch("partnerDuplicatePayoutMethod.enabled");
  const isDisabled = isConfigLoading || isSubmitting;

  return (
    <div className="rounded-xl border border-neutral-200">
      <div className="flex items-center justify-between p-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            Duplicate payout method
          </h3>
          <p className="text-content-subtle mt-0.5 text-xs font-normal tracking-normal">
            Flag partners using a payout method linked to another account
          </p>
        </div>
        <Switch
          trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
          checked={enabled}
          disabled={isDisabled}
          fn={(enabled: boolean) => {
            setValue("partnerDuplicatePayoutMethod.enabled", enabled, {
              shouldDirty: true,
            });
          }}
        />
      </div>
    </div>
  );
}
