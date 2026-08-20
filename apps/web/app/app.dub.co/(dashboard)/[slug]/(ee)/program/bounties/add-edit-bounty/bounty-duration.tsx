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
  InlineBadgePopoverContext,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import {
  AnimatedSizeContainer,
  CalendarIcon,
  ChevronLeft,
  DatePicker,
  DatePickerContext,
  Label,
} from "@dub/ui";
import { cn, formatDate } from "@dub/utils";
import { BountyStartMode } from "@prisma/client";
import { addDays, addMonths, addWeeks } from "date-fns";
import { ReactNode, useContext, useEffect, useState } from "react";

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

const BADGE_TRIGGER_CLASSNAME =
  "mx-0.5 inline-block rounded px-1.5 text-left text-sm font-semibold transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100 data-[state=open]:bg-blue-100";

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

  if (value.startMode === BountyStartMode.relative) {
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
  } else if (value.startMode === BountyStartMode.absolute) {
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
  if (value.startMode === BountyStartMode.relative) {
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

function mergeDateWithTime(date: Date, previous: Date | null | undefined) {
  const merged = new Date(date);

  if (previous) {
    merged.setHours(
      previous.getHours(),
      previous.getMinutes(),
      previous.getSeconds(),
      previous.getMilliseconds(),
    );
  }

  return merged;
}

function BountyDatePickerContent<T extends string>({
  calendar,
  options,
  selectedPreset,
  onSelectPreset,
}: {
  calendar: ReactNode;
  options: PresetOption<T>[];
  selectedPreset: T | undefined;
  onSelectPreset: (preset: T) => void;
}) {
  const { isOpen, setIsOpen } = useContext(DatePickerContext);
  const [showCustomCalendar, setShowCustomCalendar] = useState(
    selectedPreset === "custom",
  );

  useEffect(() => {
    if (!isOpen) return;
    if (selectedPreset === "custom") {
      setShowCustomCalendar(true);
    }
  }, [isOpen, selectedPreset]);

  return (
    <InlineBadgePopoverContext.Provider value={{ isOpen, setIsOpen }}>
      <AnimatedSizeContainer height width>
        {showCustomCalendar ? (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => setShowCustomCalendar(false)}
              className={cn(
                "group mx-2 mt-1.5 flex w-fit items-center gap-0.5 rounded-md px-1.5 py-1",
                "text-neutral-500 transition-colors",
                "hover:bg-neutral-100 hover:text-neutral-800",
              )}
            >
              <ChevronLeft className="size-3.5 transition-transform duration-100 group-hover:-translate-x-0.5" />
              <span className="text-xs font-medium">Presets</span>
            </button>
            {calendar}
          </div>
        ) : (
          <div className="p-1">
            <InlineBadgePopoverMenu
              selectedValue={selectedPreset}
              onSelect={(preset) => {
                if (preset === "custom") {
                  setShowCustomCalendar(true);
                  onSelectPreset(preset);
                  return;
                }

                setShowCustomCalendar(false);
                onSelectPreset(preset);
              }}
              items={options.map((option) => ({
                value: option.value,
                text: option.label,
                ...(option.value === "custom" ? { preventClose: true } : {}),
              }))}
            />
          </div>
        )}
      </AnimatedSizeContainer>
    </InlineBadgePopoverContext.Provider>
  );
}

function BountyDatePicker<T extends string>({
  label,
  options,
  selectedPreset,
  customDate,
  onSelectPreset,
  onSelectDate,
}: {
  label: string;
  options: PresetOption<T>[];
  selectedPreset: T | undefined;
  customDate: Date | null | undefined;
  onSelectPreset: (preset: T) => void;
  onSelectDate: (date: Date) => void;
}) {
  return (
    <DatePicker
      className="p-0"
      value={customDate}
      align="start"
      onChange={(date) => {
        if (!date) return;
        onSelectDate(mergeDateWithTime(date, customDate));
      }}
      trigger={({ open }) => (
        <button
          type="button"
          data-state={open ? "open" : "closed"}
          className={BADGE_TRIGGER_CLASSNAME}
        >
          {label}
        </button>
      )}
      renderContent={({ calendar }) => (
        <BountyDatePickerContent
          calendar={calendar}
          options={options}
          selectedPreset={selectedPreset}
          onSelectPreset={onSelectPreset}
        />
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
    value.startsAt?.getTime(),
    value.endsAt?.getTime(),
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
      ? value.startMode === BountyStartMode.relative
        ? "after joining"
        : "from start date"
      : null;

  return (
    <div>
      <Label>Bounty duration</Label>
      <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
        <CalendarIcon className="size-4 shrink-0 text-neutral-500" />
        <span className="text-sm font-medium leading-relaxed text-neutral-800">
          Starts{" "}
          <BountyDatePicker
            label={startLabel ?? "today"}
            options={START_OPTIONS}
            selectedPreset={startPreset}
            customDate={customStartsAt ?? value.startsAt}
            onSelectPreset={(preset) => {
              setStartPreset(preset);

              if (preset === "custom") {
                const nextCustomStartsAt = customStartsAt ?? value.startsAt;
                setCustomStartsAt(nextCustomStartsAt);
                applyTiming({
                  nextStartPreset: "custom",
                  nextCustomStartsAt,
                });
                return;
              }

              applyTiming({ nextStartPreset: preset });
            }}
            onSelectDate={(date) => {
              setStartPreset("custom");
              setCustomStartsAt(date);
              applyTiming({
                nextStartPreset: "custom",
                nextCustomStartsAt: date,
              });
            }}
          />{" "}
          and ends{" "}
          <BountyDatePicker
            label={endLabel ?? "never"}
            options={END_OPTIONS}
            selectedPreset={customEndsAfterDays != null ? undefined : endPreset}
            customDate={
              customEndsAt ?? value.endsAt ?? addWeeks(value.startsAt, 2)
            }
            onSelectPreset={(preset) => {
              setEndPreset(preset);
              setCustomEndsAfterDays(null);

              if (preset === "custom") {
                const nextCustomEndsAt =
                  customEndsAt ?? value.endsAt ?? addWeeks(value.startsAt, 2);
                setCustomEndsAt(nextCustomEndsAt);
                applyTiming({
                  nextEndPreset: "custom",
                  nextCustomEndsAt,
                });
                return;
              }

              applyTiming({ nextEndPreset: preset });
            }}
            onSelectDate={(date) => {
              setEndPreset("custom");
              setCustomEndsAfterDays(null);
              setCustomEndsAt(date);
              applyTiming({
                nextEndPreset: "custom",
                nextCustomEndsAt: date,
              });
            }}
          />
          {endSuffix && <span> {endSuffix}</span>}
        </span>
      </div>
    </div>
  );
}
