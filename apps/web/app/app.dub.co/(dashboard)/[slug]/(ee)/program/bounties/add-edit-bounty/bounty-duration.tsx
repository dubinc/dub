"use client";

import {
  BOUNTY_DURATION_DAYS,
  BOUNTY_DURATION_PRESETS,
  DurationPreset,
  EndPreset,
  resolveBountyTiming,
  StartPreset,
} from "@/lib/bounty/bounty-period";
import {
  InlineBadgePopover,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { CalendarIcon, DatePicker } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { addDays, addMonths, addWeeks } from "date-fns";
import { useEffect, useState } from "react";

type PresetOption<T extends string> = { value: T; label: string };
type BountyTimingInput = ReturnType<typeof resolveBountyTiming>;
type ParsedPresets = {
  startPreset: StartPreset;
  endPreset: EndPreset;
  customStartsAt: Date | null;
  customEndsAt: Date | null;
  customEndsAfterDays: number | null;
};

const DURATION_LABELS: Record<DurationPreset, { start: string; end: string }> =
  {
    twoWeeks: { start: "in 2 weeks", end: "2 weeks" },
    oneMonth: { start: "in 1 month", end: "1 month" },
    sixMonths: { start: "in 6 months", end: "6 months" },
  };

const START_OPTIONS = [
  { value: "today", label: "today" },
  ...BOUNTY_DURATION_PRESETS.map((p) => ({
    value: p,
    label: DURATION_LABELS[p].start,
  })),
  { value: "onPartnerJoin", label: "when a new partner joins" },
  { value: "custom", label: "custom" },
] satisfies PresetOption<StartPreset>[];

const END_OPTIONS = [
  { value: "never", label: "never" },
  ...BOUNTY_DURATION_PRESETS.map((p) => ({
    value: p,
    label: DURATION_LABELS[p].end,
  })),
  { value: "custom", label: "custom" },
] satisfies PresetOption<EndPreset>[];

const START_DURATION_DATES: Record<DurationPreset, (now: Date) => Date> = {
  twoWeeks: (now) => addWeeks(now, 2),
  oneMonth: (now) => addMonths(now, 1),
  sixMonths: (now) => addMonths(now, 6),
};

const DATE_TOLERANCE_MS = 60_000;

function datesAreClose(a: Date, b: Date, toleranceMs = DATE_TOLERANCE_MS) {
  return Math.abs(a.getTime() - b.getTime()) <= toleranceMs;
}

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function findDurationPresetByDays(days: number): DurationPreset | null {
  return (
    (Object.entries(BOUNTY_DURATION_DAYS) as [DurationPreset, number][]).find(
      ([, durationDays]) => durationDays === days,
    )?.[0] ?? null
  );
}

function getPresetLabel<T extends string>(
  preset: T,
  options: PresetOption<T>[],
  customDate?: Date | null,
  fallback?: string,
) {
  if (preset === "custom" && customDate) {
    return formatDate(customDate, { month: "short" });
  }

  return options.find((option) => option.value === preset)?.label ?? fallback;
}

function parsePresets(value: BountyTimingInput): ParsedPresets {
  let startPreset: StartPreset;
  let customStartsAt: Date | null;

  if (value.startMode === "relative") {
    startPreset = "onPartnerJoin";
    customStartsAt = null;
  } else {
    const now = new Date();

    if (isSameCalendarDay(value.startsAt, now)) {
      startPreset = "today";
      customStartsAt = null;
    } else {
      const matchedStartPreset = BOUNTY_DURATION_PRESETS.find((preset) =>
        datesAreClose(value.startsAt, START_DURATION_DATES[preset](now)),
      );

      if (matchedStartPreset) {
        startPreset = matchedStartPreset;
        customStartsAt = null;
      } else {
        startPreset = "custom";
        customStartsAt = value.startsAt;
      }
    }
  }

  let endPreset: EndPreset;
  let customEndsAt: Date | null;

  if (value.endsAfterDays != null) {
    const durationPreset = findDurationPresetByDays(value.endsAfterDays);

    if (durationPreset) {
      return {
        startPreset,
        endPreset: durationPreset,
        customStartsAt,
        customEndsAt: null,
        customEndsAfterDays: null,
      };
    }
  }

  if (!value.endsAt) {
    endPreset = "never";
    customEndsAt = null;
  } else if (value.startMode === "absolute") {
    const matchedEndPreset = (
      Object.entries(BOUNTY_DURATION_DAYS) as [DurationPreset, number][]
    ).find(([, days]) =>
      datesAreClose(value.endsAt!, addDays(value.startsAt, days)),
    )?.[0];

    if (matchedEndPreset) {
      endPreset = matchedEndPreset;
      customEndsAt = null;
    } else {
      endPreset = "custom";
      customEndsAt = value.endsAt;
    }
  } else {
    endPreset = "custom";
    customEndsAt = value.endsAt;
  }

  return {
    startPreset,
    endPreset,
    customStartsAt,
    customEndsAt,
    customEndsAfterDays: null,
  };
}

function parsePresetsForEdit(value: BountyTimingInput): ParsedPresets {
  if (value.startMode === "relative") {
    const startPreset: StartPreset = "onPartnerJoin";
    const customStartsAt = null;

    if (value.endsAfterDays != null) {
      const durationPreset = findDurationPresetByDays(value.endsAfterDays);

      if (durationPreset) {
        return {
          startPreset,
          endPreset: durationPreset,
          customStartsAt,
          customEndsAt: null,
          customEndsAfterDays: null,
        };
      }

      return {
        startPreset,
        endPreset: "never",
        customStartsAt,
        customEndsAt: null,
        customEndsAfterDays: value.endsAfterDays,
      };
    }

    if (value.endsAt) {
      return {
        startPreset,
        endPreset: "custom",
        customStartsAt,
        customEndsAt: value.endsAt,
        customEndsAfterDays: null,
      };
    }

    return {
      startPreset,
      endPreset: "never",
      customStartsAt,
      customEndsAt: null,
      customEndsAfterDays: null,
    };
  }

  const startPreset: StartPreset = "custom";
  const customStartsAt = value.startsAt;

  if (!value.endsAt) {
    return {
      startPreset,
      endPreset: "never",
      customStartsAt,
      customEndsAt: null,
      customEndsAfterDays: null,
    };
  }

  return {
    startPreset,
    endPreset: "custom",
    customStartsAt,
    customEndsAt: value.endsAt,
    customEndsAfterDays: null,
  };
}

function parsePresetsFromValue(
  value: BountyTimingInput,
  isEditing: boolean,
): ParsedPresets {
  return isEditing ? parsePresetsForEdit(value) : parsePresets(value);
}

function CustomDatePickerIcon({
  value,
  onChange,
}: {
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
}) {
  return (
    <DatePicker
      value={value ?? undefined}
      onChange={(date) => {
        if (!date) {
          onChange(null);
          return;
        }

        const merged = new Date(date);

        if (value) {
          merged.setHours(
            value.getHours(),
            value.getMinutes(),
            value.getSeconds(),
            value.getMilliseconds(),
          );
        }

        onChange(merged);
      }}
      align="start"
      showYearNavigation
      trigger={() => (
        <button
          type="button"
          className="inline-flex items-center rounded p-0.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <CalendarIcon className="size-3.5" />
        </button>
      )}
    />
  );
}

interface BountyDurationProps {
  value: BountyTimingInput;
  onChange: (value: BountyTimingInput) => void;
  isEditing?: boolean;
}

export function BountyDuration({
  value,
  onChange,
  isEditing = false,
}: BountyDurationProps) {
  const initialPresets = parsePresetsFromValue(value, isEditing);

  const [startPreset, setStartPreset] = useState<StartPreset>(
    initialPresets.startPreset,
  );

  const [endPreset, setEndPreset] = useState<EndPreset>(
    initialPresets.endPreset,
  );

  const [customStartsAt, setCustomStartsAt] = useState<Date | null>(
    initialPresets.customStartsAt,
  );

  const [customEndsAt, setCustomEndsAt] = useState<Date | null>(
    initialPresets.customEndsAt,
  );

  const [customEndsAfterDays, setCustomEndsAfterDays] = useState<number | null>(
    initialPresets.customEndsAfterDays,
  );

  const [endDateLocked] = useState(
    () => isEditing && (value.endsAt != null || value.endsAfterDays != null),
  );

  const endOptions = endDateLocked
    ? END_OPTIONS.filter((option) => option.value !== "never")
    : END_OPTIONS;

  useEffect(() => {
    const presets = parsePresetsFromValue(value, isEditing);
    setStartPreset(presets.startPreset);
    setEndPreset(presets.endPreset);
    setCustomStartsAt(presets.customStartsAt);
    setCustomEndsAt(presets.customEndsAt);
    setCustomEndsAfterDays(presets.customEndsAfterDays);
  }, [
    isEditing,
    value.startMode,
    value.startsAt,
    value.endsAt,
    value.endsAfterDays,
  ]);

  const applyTiming = ({
    nextStartPreset = startPreset,
    nextEndPreset = endPreset,
    nextCustomStartsAt = customStartsAt,
    nextCustomEndsAt = customEndsAt,
  }: {
    nextStartPreset?: StartPreset;
    nextEndPreset?: EndPreset;
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

  const startLabel = getPresetLabel(
    startPreset,
    START_OPTIONS,
    customStartsAt ?? value.startsAt,
    "today",
  );

  const endLabel =
    customEndsAfterDays != null
      ? `${customEndsAfterDays} days`
      : getPresetLabel(
          endPreset,
          END_OPTIONS,
          customEndsAt ?? value.endsAt,
          "never",
        );

  const endSuffix =
    customEndsAfterDays != null ||
    (endPreset !== "never" && endPreset !== "custom")
      ? value.startMode === "relative"
        ? "after joining"
        : "from start date"
      : null;

  return (
    <div>
      <div className="flex items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
        <CalendarIcon className="size-4 shrink-0 text-neutral-500" />
        <span className="text-sm font-medium leading-relaxed text-neutral-800">
          Starts{" "}
          <span className="inline-flex items-center gap-0.5">
            <InlineBadgePopover text={startLabel} buttonClassName="mx-0.5">
              <InlineBadgePopoverMenu
                items={START_OPTIONS.map((option) => ({
                  value: option.value,
                  text: option.label,
                }))}
                selectedValue={startPreset}
                onSelect={(preset) => {
                  setStartPreset(preset);

                  if (preset === "custom") {
                    setCustomStartsAt(customStartsAt ?? value.startsAt);
                    return;
                  }

                  applyTiming({ nextStartPreset: preset });
                }}
              />
            </InlineBadgePopover>
            {startPreset === "custom" && (
              <CustomDatePickerIcon
                value={customStartsAt ?? value.startsAt}
                onChange={(date) => {
                  const nextCustomStartsAt = date ?? null;
                  setCustomStartsAt(nextCustomStartsAt);
                  applyTiming({
                    nextStartPreset: "custom",
                    nextCustomStartsAt,
                  });
                }}
              />
            )}
          </span>{" "}
          and ends{" "}
          <span className="inline-flex items-center gap-0.5">
            <InlineBadgePopover text={endLabel} buttonClassName="mx-0.5">
              <InlineBadgePopoverMenu
                items={endOptions.map((option) => ({
                  value: option.value,
                  text: option.label,
                }))}
                selectedValue={
                  customEndsAfterDays != null ? undefined : endPreset
                }
                onSelect={(preset) => {
                  if (endDateLocked && preset === "never") {
                    return;
                  }

                  setEndPreset(preset);
                  setCustomEndsAfterDays(null);

                  if (preset === "custom") {
                    setCustomEndsAt(
                      customEndsAt ??
                        value.endsAt ??
                        addWeeks(value.startsAt, 2),
                    );
                    return;
                  }

                  applyTiming({ nextEndPreset: preset });
                }}
              />
            </InlineBadgePopover>
            {endPreset === "custom" && (
              <CustomDatePickerIcon
                value={customEndsAt ?? value.endsAt}
                onChange={(date) => {
                  const nextCustomEndsAt = date ?? null;
                  setCustomEndsAt(nextCustomEndsAt);
                  applyTiming({
                    nextEndPreset: "custom",
                    nextCustomEndsAt,
                  });
                }}
              />
            )}
          </span>
          {endSuffix && <span> {endSuffix}</span>}
        </span>
      </div>
    </div>
  );
}
