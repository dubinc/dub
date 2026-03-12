"use client";

import { UpdateFraudRuleSettings } from "@/lib/types";
import { Switch } from "@dub/ui";
import { useFormContext } from "react-hook-form";

interface FraudPartnerCrossProgramBanSettingsProps {
  isConfigLoading?: boolean;
}

export function FraudPartnerCrossProgramBanSettings({
  isConfigLoading = false,
}: FraudPartnerCrossProgramBanSettingsProps) {
  const {
    watch,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<UpdateFraudRuleSettings>();

  const enabled = watch("partnerCrossProgramBan.enabled");
  const isDisabled = isConfigLoading || isSubmitting;

  return (
    <div className="rounded-xl border border-neutral-200">
      <div className="flex items-center justify-between p-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            Cross-program ban
          </h3>
          <p className="text-content-subtle mt-0.5 text-xs font-normal tracking-normal">
            Flag partners banned from other Dub programs
          </p>
        </div>
        <Switch
          trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
          checked={enabled}
          disabled={isDisabled}
          fn={(enabled: boolean) => {
            setValue("partnerCrossProgramBan.enabled", enabled, {
              shouldDirty: true,
            });
          }}
        />
      </div>
    </div>
  );
}
