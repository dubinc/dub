"use client";

import { UpdateFraudRuleSettings } from "@/lib/types";
import { Switch } from "@dub/ui";
import { useFormContext } from "react-hook-form";

interface FraudCustomerEmailMatchSettingsProps {
  isConfigLoading?: boolean;
}

export function FraudCustomerEmailMatchSettings({
  isConfigLoading = false,
}: FraudCustomerEmailMatchSettingsProps) {
  const {
    watch,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<UpdateFraudRuleSettings>();

  const enabled = watch("customerEmailMatch.enabled");
  const isDisabled = isConfigLoading || isSubmitting;

  return (
    <div className="rounded-xl border border-neutral-200">
      <div className="flex items-center justify-between p-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            Matching customer email
          </h3>
          <p className="text-content-subtle mt-0.5 text-xs font-normal tracking-normal">
            Flag when a partner&apos;s email matches a customer&apos;s email
          </p>
        </div>
        <Switch
          trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
          checked={enabled}
          disabled={isDisabled}
          fn={(enabled: boolean) => {
            setValue("customerEmailMatch.enabled", enabled, {
              shouldDirty: true,
            });
          }}
        />
      </div>
    </div>
  );
}
