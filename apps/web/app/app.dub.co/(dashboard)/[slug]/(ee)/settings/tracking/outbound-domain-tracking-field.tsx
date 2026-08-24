"use client";

import { EnableSwitch } from "./enable-switch";

export function OutboundDomainTrackingField({
  enabled,
  onEnabledChange,
  disabled,
  disabledTooltip,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
  disabledTooltip?: string;
}) {
  return (
    <EnableSwitch
      checked={enabled}
      onChange={onEnabledChange}
      disabled={disabled}
      disabledTooltip={disabledTooltip}
    />
  );
}
