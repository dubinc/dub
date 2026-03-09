"use client";

import { UpdateFraudRuleSettings } from "@/lib/types";
import { Switch } from "@dub/ui";
import { useFormContext } from "react-hook-form";

interface FraudCustomerEmailSuspiciousDomainSettingsProps {
  isConfigLoading?: boolean;
}

export function FraudCustomerEmailSuspiciousDomainSettings({
  isConfigLoading = false,
}: FraudCustomerEmailSuspiciousDomainSettingsProps) {
  const {
    watch,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<UpdateFraudRuleSettings>();

  const enabled = watch("customerEmailSuspiciousDomain.enabled");
  const isDisabled = isConfigLoading || isSubmitting;

  return (
    <div className="rounded-xl border border-neutral-200">
      <div className="flex items-center justify-between p-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            Suspicious customer email domain
          </h3>
          <p className="text-content-subtle mt-0.5 text-xs font-normal tracking-normal">
            Flag customers using disposable or temporary email domains
          </p>
        </div>
        <Switch
          trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
          checked={enabled}
          disabled={isDisabled}
          fn={(enabled: boolean) => {
            setValue("customerEmailSuspiciousDomain.enabled", enabled, {
              shouldDirty: true,
            });
          }}
        />
      </div>
    </div>
  );
}
