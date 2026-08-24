"use client";

import { Switch } from "@dub/ui";

export function EnableSwitch({
  checked,
  onChange,
  disabled,
  disabledTooltip,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  disabledTooltip?: string;
}) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2">
      <Switch
        checked={checked}
        fn={onChange}
        disabled={disabled}
        disabledTooltip={disabledTooltip}
      />
      <span className="text-content-default text-sm font-medium">Enable</span>
    </label>
  );
}
