"use client";

import { getUtcPeriodDate } from "@/lib/api/rewards/custom-reward-utils";
import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import type { CustomRewardConfig } from "@/lib/types";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import {
  CUSTOM_REWARD_CADENCE_PRESETS,
  customRewardConfigSchema,
} from "@/lib/zod/schemas/rewards";
import { DatePicker } from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { useContext, useEffect, useMemo } from "react";
import { DurationPopoverContent } from "../../shared/duration-popover-content";
import {
  InlineBadgePopover,
  InlineBadgePopoverContext,
  InlineBadgePopoverMenu,
} from "../../shared/inline-badge-popover";
import { useAddEditRewardForm } from "./add-edit-reward-sheet";

function parseCustomConfig(config: unknown): CustomRewardConfig | null {
  const parsed = customRewardConfigSchema.safeParse(config);
  return parsed.success ? parsed.data : null;
}

function getCadencePresetValue(config: CustomRewardConfig | null) {
  if (!config) {
    return "monthly";
  }

  const preset = CUSTOM_REWARD_CADENCE_PRESETS.find(
    (p) => p.frequency === config.frequency && p.interval === config.interval,
  );

  return preset?.value ?? "monthly";
}

export function CustomRewardBuilder() {
  const { watch, setValue } = useAddEditRewardForm();

  const [amountInCents, config, maxDuration] = watch([
    "amountInCents",
    "config",
    "maxDuration",
  ]);

  const customConfig = useMemo(() => parseCustomConfig(config), [config]);
  const cadenceValue = getCadencePresetValue(customConfig);

  useEffect(() => {
    setValue("type", "flat", { shouldDirty: false });

    if (customConfig) {
      return;
    }

    const monthly = CUSTOM_REWARD_CADENCE_PRESETS.find(
      (p) => p.value === "monthly",
    )!;

    setValue(
      "config",
      {
        frequency: monthly.frequency,
        interval: monthly.interval,
        anchorDate: getUtcPeriodDate(),
      },
      { shouldDirty: false },
    );
  }, [customConfig, setValue]);

  const amountLabel =
    amountInCents != null && !Number.isNaN(amountInCents)
      ? constructRewardAmount({
          type: "flat",
          amountInCents: amountInCents * 100,
          amountInPercentage: null,
          maxDuration: null,
        })
      : "amount";

  const cadenceLabel =
    CUSTOM_REWARD_CADENCE_PRESETS.find(
      (p) => p.value === cadenceValue,
    )?.label.toLowerCase() ?? "monthly";

  const durationLabel =
    maxDuration === Infinity || maxDuration == null
      ? "indefinitely"
      : `for ${maxDuration} ${pluralize("month", Number(maxDuration))}`;

  const minAnchorDate = useMemo(
    () => new Date(`${getUtcPeriodDate()}T12:00:00`),
    [],
  );

  const anchorDate = customConfig?.anchorDate
    ? new Date(`${customConfig.anchorDate}T12:00:00`)
    : undefined;

  return (
    <span className="leading-relaxed">
      Pay{" "}
      <InlineBadgePopover text={amountLabel} invalid={amountInCents == null}>
        <AmountInput />
      </InlineBadgePopover>{" "}
      <InlineBadgePopover text={cadenceLabel}>
        <InlineBadgePopoverMenu
          selectedValue={cadenceValue}
          onSelect={(value) => {
            const preset = CUSTOM_REWARD_CADENCE_PRESETS.find(
              (p) => p.value === value,
            );
            if (!preset) {
              return;
            }

            setValue(
              "config",
              {
                frequency: preset.frequency,
                interval: preset.interval,
                anchorDate: customConfig?.anchorDate ?? getUtcPeriodDate(),
              },
              { shouldDirty: true },
            );
          }}
          items={CUSTOM_REWARD_CADENCE_PRESETS.map((preset) => ({
            text: preset.label,
            value: preset.value,
          }))}
        />
      </InlineBadgePopover>
      , starting{" "}
      <DatePicker
        value={anchorDate}
        onChange={(date) => {
          if (!date) {
            return;
          }

          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const nextAnchorDate = `${year}-${month}-${day}`;

          if (nextAnchorDate < getUtcPeriodDate()) {
            return;
          }

          setValue(
            "config",
            {
              frequency: customConfig?.frequency ?? "month",
              interval: customConfig?.interval ?? 1,
              anchorDate: nextAnchorDate,
            },
            { shouldDirty: true },
          );
        }}
        placeholder="Select date"
        invalid={!customConfig?.anchorDate}
        fromDate={minAnchorDate}
        disabledDays={{ before: minAnchorDate }}
        trigger={({ displayValue, placeholder, invalid }) => (
          <button
            type="button"
            className={cn(
              "inline-block rounded px-1.5 text-left text-sm font-semibold transition-colors",
              invalid
                ? "bg-orange-50 text-orange-500 hover:bg-orange-100 data-[state=open]:bg-orange-100"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 data-[state=open]:bg-blue-100",
            )}
          >
            {displayValue ?? placeholder}
          </button>
        )}
      />{" "}
      <InlineBadgePopover text={durationLabel}>
        <DurationPopoverContent
          value={
            maxDuration === Infinity || maxDuration == null
              ? Infinity
              : Number(maxDuration)
          }
          onChange={(value) =>
            setValue("maxDuration", value === Infinity ? null : value, {
              shouldDirty: true,
            })
          }
          presetDurations={RECURRING_MAX_DURATIONS.filter(
            (v) => v !== 0 && v !== 1,
          )}
          hideLifetime
        />
      </InlineBadgePopover>
    </span>
  );
}

function AmountInput() {
  const { register } = useAddEditRewardForm();
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  return (
    <div className="relative rounded-md shadow-sm">
      <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-sm text-neutral-500">
        $
      </span>
      <input
        className="block w-full rounded-md border-neutral-300 pl-4 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
        placeholder="0.00"
        {...register("amountInCents", {
          required: true,
          setValueAs: (value: string) => (value === "" ? undefined : +value),
          min: 0,
          onChange: handleMoneyInputChange,
        })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setIsOpen(false);
            return;
          }
          handleMoneyKeyDown(e);
        }}
      />
    </div>
  );
}
