"use client";

import {
  BOUNTY_DURATION_DAYS,
  BOUNTY_DURATION_PRESETS,
  BOUNTY_DURATION_UNIT_DAYS,
  BOUNTY_DURATION_UNITS,
  BOUNTY_MAX_ENDS_AFTER_DAYS,
  BountyDurationUnit,
  DurationPreset,
  EndPreset,
  formatEndsAfterDays,
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
import { cn, formatDate, pluralize } from "@dub/utils";
import { BountyStartMode } from "@prisma/client";
import { addDays, addMonths, addWeeks } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useParams } from "next/navigation";
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
  { value: "customDuration", label: "custom duration" },
  { value: "custom", label: "custom date" },
] satisfies PresetOption<EndPreset>[];

// Applied when "custom duration" is picked and no number has been typed
const DEFAULT_CUSTOM_DURATION = { amount: 3, unit: "month" } as const;

// What's typed into the custom duration input. Only the day count is saved,
// so this keeps the typed unit for labels while the form is open.
type DurationDraft = { amount: string; unit: BountyDurationUnit };

const DEFAULT_DURATION_DRAFT: DurationDraft = {
  amount: "",
  unit: DEFAULT_CUSTOM_DURATION.unit,
};

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

function parseEndsAfterDays(
  endsAfterDays: number,
): Pick<ParsedPresets, "endPreset" | "customEndsAt" | "customEndsAfterDays"> {
  const durationPreset = findDurationPresetByDays(endsAfterDays);

  return {
    endPreset: durationPreset ?? "customDuration",
    customEndsAt: null,
    customEndsAfterDays: durationPreset ? null : endsAfterDays,
  };
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
    return {
      startPreset,
      customStartsAt,
      ...parseEndsAfterDays(value.endsAfterDays),
    };
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
      return {
        startPreset,
        customStartsAt,
        ...parseEndsAfterDays(value.endsAfterDays),
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

function getPickerView(preset: string | undefined) {
  if (preset === "custom") return "calendar";
  if (preset === "customDuration") return "duration";
  return "presets";
}

function BountyDatePickerContent<T extends string>({
  calendar,
  durationContent,
  options,
  selectedPreset,
  onSelectPreset,
}: {
  calendar: ReactNode;
  durationContent?: ReactNode;
  options: PresetOption<T>[];
  selectedPreset: T | undefined;
  onSelectPreset: (preset: T) => void;
}) {
  const { isOpen, setIsOpen } = useContext(DatePickerContext);
  const [view, setView] = useState(() => getPickerView(selectedPreset));

  useEffect(() => {
    if (!isOpen) return;
    const nextView = getPickerView(selectedPreset);
    if (nextView !== "presets") {
      setView(nextView);
    }
  }, [isOpen, selectedPreset]);

  return (
    <InlineBadgePopoverContext.Provider value={{ isOpen, setIsOpen }}>
      <AnimatedSizeContainer height width>
        {view !== "presets" ? (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => setView("presets")}
              className={cn(
                "group mx-2 mt-1.5 flex w-fit items-center gap-0.5 rounded-md px-1.5 py-1",
                "text-neutral-500 transition-colors",
                "hover:bg-neutral-100 hover:text-neutral-800",
              )}
            >
              <ChevronLeft className="size-3.5 transition-transform duration-100 group-hover:-translate-x-0.5" />
              <span className="text-xs font-medium">Presets</span>
            </button>
            {view === "duration" ? (
              <div className="px-3 pb-3 pt-1">{durationContent}</div>
            ) : (
              calendar
            )}
          </div>
        ) : (
          <div className="p-1">
            <InlineBadgePopoverMenu
              selectedValue={selectedPreset}
              onSelect={(preset) => {
                setView(getPickerView(preset));
                onSelectPreset(preset);
              }}
              items={options.map((option) => ({
                value: option.value,
                text: option.label,
                ...(getPickerView(option.value) !== "presets"
                  ? { preventClose: true }
                  : {}),
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
  durationContent,
  onSelectPreset,
  onSelectDate,
}: {
  label: string;
  options: PresetOption<T>[];
  selectedPreset: T | undefined;
  customDate: Date | null | undefined;
  durationContent?: ReactNode;
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
          durationContent={durationContent}
          options={options}
          selectedPreset={selectedPreset}
          onSelectPreset={onSelectPreset}
        />
      )}
    />
  );
}

function clampDurationAmount(amount: number, unit: BountyDurationUnit) {
  return Math.max(
    1,
    Math.min(
      amount,
      Math.floor(BOUNTY_MAX_ENDS_AFTER_DAYS / BOUNTY_DURATION_UNIT_DAYS[unit]),
    ),
  );
}

function getDraftFromDays(days: number | null): DurationDraft {
  return days != null
    ? { amount: days.toString(), unit: "day" }
    : DEFAULT_DURATION_DRAFT;
}

// An empty amount falls back to the placeholder; null while it isn't a number
function getDraftAmount(draft: DurationDraft) {
  if (draft.amount === "") return DEFAULT_CUSTOM_DURATION.amount;
  const parsed = parseInt(draft.amount, 10);
  return isNaN(parsed) ? null : clampDurationAmount(parsed, draft.unit);
}

function getDraftDays(draft: DurationDraft) {
  const amount = getDraftAmount(draft);
  return amount == null ? null : amount * BOUNTY_DURATION_UNIT_DAYS[draft.unit];
}

function BountyCustomDurationInput({
  draft,
  onChange,
}: {
  draft: DurationDraft;
  onChange: (draft: DurationDraft) => void;
}) {
  const { setIsOpen } = useContext(DatePickerContext);
  const amount = getDraftAmount(draft) ?? DEFAULT_CUSTOM_DURATION.amount;

  return (
    <div className="flex w-fit rounded-md border border-neutral-300 shadow-sm focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500">
      <input
        type="number"
        min="1"
        step="1"
        autoFocus
        aria-label="Duration"
        placeholder={DEFAULT_CUSTOM_DURATION.amount.toString()}
        value={draft.amount}
        className="block w-10 rounded-l-md border-none py-1 pl-2 pr-0 text-neutral-900 placeholder-neutral-400 [appearance:textfield] focus:outline-none focus:ring-0 sm:text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        onChange={(e) => onChange({ ...draft, amount: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setIsOpen(false);
          }
        }}
      />
      {/* The native <select> is stretched invisibly over the label so the unit
          sits right-aligned against the chevron at a fixed width */}
      <div className="relative flex shrink-0 items-center gap-1.5 rounded-r-md py-1 pl-1 pr-2 text-sm text-neutral-600">
        <span className="grid text-right" aria-hidden>
          {/* Widest label reserves the width for every unit */}
          <span className="invisible col-start-1 row-start-1">months</span>
          <span className="col-start-1 row-start-1">
            {pluralize(draft.unit, amount)}
          </span>
        </span>
        <ChevronDown className="size-3.5 text-neutral-500" aria-hidden />
        <select
          aria-label="Duration unit"
          value={draft.unit}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          onChange={(e) =>
            onChange({
              ...draft,
              unit: e.target.value as BountyDurationUnit,
            })
          }
        >
          {BOUNTY_DURATION_UNITS.map((u) => (
            <option key={u} value={u}>
              {pluralize(u, amount)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

interface BountyDurationProps {
  value: BountyTimingInput;
  onChange: (value: BountyTimingInput) => void;
}

export function BountyDuration({ value, onChange }: BountyDurationProps) {
  const { bountyId } = useParams();
  const isEditing = !!bountyId;
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

  const [durationDraft, setDurationDraft] = useState<DurationDraft>(() =>
    getDraftFromDays(initialPresets.customEndsAfterDays),
  );

  useEffect(() => {
    const presets = parsePresetsFromValue(value, isEditing);

    // Keep a typed duration while the value still matches it. Otherwise it
    // re-parses as a preset (e.g. 30 days → "1 month"), or as a date on a
    // fixed-start bounty, where it's stored as endsAt.
    const keepsCustomDuration =
      endPreset === "customDuration" &&
      customEndsAfterDays != null &&
      (value.endsAfterDays === customEndsAfterDays ||
        (value.endsAt != null &&
          datesAreClose(
            value.endsAt,
            addDays(value.startsAt, customEndsAfterDays),
          )));

    if (
      presets.customEndsAfterDays != null &&
      presets.customEndsAfterDays !== getDraftDays(durationDraft)
    ) {
      setDurationDraft(getDraftFromDays(presets.customEndsAfterDays));
    }

    setStartPreset(presets.startPreset);
    setEndPreset(keepsCustomDuration ? "customDuration" : presets.endPreset);
    setCustomStartsAt(presets.customStartsAt);
    setCustomEndsAt(keepsCustomDuration ? null : presets.customEndsAt);
    setCustomEndsAfterDays(
      keepsCustomDuration ? customEndsAfterDays : presets.customEndsAfterDays,
    );
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
    nextCustomEndsAfterDays = customEndsAfterDays,
  }: {
    nextStartPreset?: StartPreset;
    nextEndPreset?: EndPreset;
    nextCustomStartsAt?: Date | null;
    nextCustomEndsAt?: Date | null;
    nextCustomEndsAfterDays?: number | null;
  } = {}) => {
    onChange(
      resolveBountyTiming({
        startPreset: nextStartPreset,
        endPreset: nextEndPreset,
        customStartsAt: nextCustomStartsAt,
        customEndsAt: nextCustomEndsAt,
        customEndsAfterDays: nextCustomEndsAfterDays,
      }),
    );
  };

  const applyDurationDraft = (draft: DurationDraft) => {
    const amount = getDraftAmount(draft);
    const nextDraft =
      amount != null && draft.amount !== ""
        ? { ...draft, amount: amount.toString() }
        : draft;
    setDurationDraft(nextDraft);

    const days = getDraftDays(nextDraft);
    if (days == null) return;

    setEndPreset("customDuration");
    setCustomEndsAt(null);
    setCustomEndsAfterDays(days);
    applyTiming({
      nextEndPreset: "customDuration",
      nextCustomEndsAt: null,
      nextCustomEndsAfterDays: days,
    });
  };

  const isRelative = value.startMode === BountyStartMode.relative;
  const hasCustomEndsAfterDays =
    endPreset === "customDuration" && customEndsAfterDays != null;

  const startLabel = getPresetLabel(
    startPreset,
    START_OPTIONS,
    customStartsAt ?? value.startsAt,
    "today",
  );

  const draftAmount = getDraftAmount(durationDraft);
  const endLabel = hasCustomEndsAfterDays
    ? draftAmount != null && getDraftDays(durationDraft) === customEndsAfterDays
      ? `${draftAmount} ${pluralize(durationDraft.unit, draftAmount)}`
      : formatEndsAfterDays(customEndsAfterDays)
    : getPresetLabel(
        endPreset,
        END_OPTIONS,
        customEndsAt ?? value.endsAt,
        "never",
      );

  const endSuffix =
    hasCustomEndsAfterDays ||
    (endPreset !== "never" &&
      endPreset !== "custom" &&
      endPreset !== "customDuration")
      ? isRelative
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
            selectedPreset={endPreset}
            customDate={
              customEndsAt ?? value.endsAt ?? addWeeks(value.startsAt, 2)
            }
            durationContent={
              <BountyCustomDurationInput
                draft={durationDraft}
                onChange={applyDurationDraft}
              />
            }
            onSelectPreset={(preset) => {
              if (preset === "customDuration") {
                if (!hasCustomEndsAfterDays) applyDurationDraft(durationDraft);
                return;
              }

              setEndPreset(preset);
              setCustomEndsAfterDays(null);

              if (preset === "custom") {
                const nextCustomEndsAt =
                  customEndsAt ?? value.endsAt ?? addWeeks(value.startsAt, 2);
                setCustomEndsAt(nextCustomEndsAt);
                applyTiming({
                  nextEndPreset: "custom",
                  nextCustomEndsAt,
                  nextCustomEndsAfterDays: null,
                });
                return;
              }

              applyTiming({
                nextEndPreset: preset,
                nextCustomEndsAfterDays: null,
              });
            }}
            onSelectDate={(date) => {
              setEndPreset("custom");
              setCustomEndsAfterDays(null);
              setCustomEndsAt(date);
              applyTiming({
                nextEndPreset: "custom",
                nextCustomEndsAt: date,
                nextCustomEndsAfterDays: null,
              });
            }}
          />
          {endSuffix && <span> {endSuffix}</span>}
        </span>
      </div>
    </div>
  );
}
