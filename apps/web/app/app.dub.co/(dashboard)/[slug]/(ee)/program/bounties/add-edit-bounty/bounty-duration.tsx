"use client";

import {
  BOUNTY_END_PRESET_OPTIONS,
  BOUNTY_START_PRESET_OPTIONS,
  BountyEndPreset,
  BountyStartPreset,
  BountyTimingValue,
  getBountyEndPresetLabel,
  getBountyEndSuffix,
  getBountyStartPresetLabel,
  parseBountyTimingPresets,
  resolveBountyTiming,
} from "@/lib/bounty/bounty-timing";
import {
  InlineBadgePopover,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { CalendarIcon, SmartDateTimePicker } from "@dub/ui";
import { useState } from "react";

interface BountyDurationProps {
  value: BountyTimingValue;
  onChange: (value: BountyTimingValue) => void;
}

export function BountyDuration({ value, onChange }: BountyDurationProps) {
  const initialPresets = parseBountyTimingPresets(value);

  const [startPreset, setStartPreset] = useState<BountyStartPreset>(
    initialPresets.startPreset,
  );

  const [endPreset, setEndPreset] = useState<BountyEndPreset>(
    initialPresets.endPreset,
  );

  const [customStartsAt, setCustomStartsAt] = useState<Date | null>(
    initialPresets.customStartsAt,
  );

  const [customEndsAt, setCustomEndsAt] = useState<Date | null>(
    initialPresets.customEndsAt,
  );

  const applyTiming = ({
    nextStartPreset = startPreset,
    nextEndPreset = endPreset,
    nextCustomStartsAt = customStartsAt,
    nextCustomEndsAt = customEndsAt,
  }: {
    nextStartPreset?: BountyStartPreset;
    nextEndPreset?: BountyEndPreset;
    nextCustomStartsAt?: Date | null;
    nextCustomEndsAt?: Date | null;
  } = {}) => {
    onChange(
      resolveBountyTiming({
        startPreset: nextStartPreset,
        endPreset: nextEndPreset,
        customStartsAt: nextCustomStartsAt,
        customEndsAt: nextCustomEndsAt,
      }),
    );
  };

  const startLabel = getBountyStartPresetLabel({
    startPreset,
    customStartsAt,
    startsAt: value.startsAt,
  });

  const endLabel = getBountyEndPresetLabel({
    endPreset,
    customEndsAt,
    endsAt: value.endsAt,
  });

  const endSuffix = getBountyEndSuffix({
    startMode: value.startMode,
    endPreset,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
        <CalendarIcon className="size-4 shrink-0 text-neutral-500" />
        <span className="text-content-default text-sm leading-relaxed">
          Starts{" "}
          <InlineBadgePopover text={startLabel} buttonClassName="mx-0.5">
            <InlineBadgePopoverMenu
              items={BOUNTY_START_PRESET_OPTIONS.map((option) => ({
                value: option.value,
                text: option.label,
              }))}
              selectedValue={startPreset}
              onSelect={(preset) => {
                setStartPreset(preset);
                applyTiming({ nextStartPreset: preset });
              }}
            />
          </InlineBadgePopover>{" "}
          and ends{" "}
          <InlineBadgePopover text={endLabel} buttonClassName="mx-0.5">
            <InlineBadgePopoverMenu
              items={BOUNTY_END_PRESET_OPTIONS.map((option) => ({
                value: option.value,
                text: option.label,
              }))}
              selectedValue={endPreset}
              onSelect={(preset) => {
                setEndPreset(preset);
                applyTiming({ nextEndPreset: preset });
              }}
            />
          </InlineBadgePopover>
          {endSuffix && (
            <span className="text-content-subtle"> {endSuffix}</span>
          )}
        </span>
      </div>

      {startPreset === "custom" && (
        <SmartDateTimePicker
          value={customStartsAt ?? value.startsAt}
          onChange={(date) => {
            const nextCustomStartsAt = date ?? null;
            setCustomStartsAt(nextCustomStartsAt);
            applyTiming({ nextCustomStartsAt });
          }}
          placeholder='E.g. "2026-02-28", "Last Thursday", "2 hours ago"'
        />
      )}

      {endPreset === "custom" && (
        <SmartDateTimePicker
          value={customEndsAt ?? value.endsAt}
          onChange={(date) => {
            const nextCustomEndsAt = date ?? null;
            setCustomEndsAt(nextCustomEndsAt);
            applyTiming({ nextCustomEndsAt });
          }}
          placeholder='E.g. "2026-12-01", "Next Thursday", "After 10 days"'
        />
      )}
    </div>
  );
}
