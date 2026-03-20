"use client";

import { cn } from "@dub/utils";
import { ChevronDown, ChevronLeft } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type Ref,
} from "react";
import { Popover } from "../popover";
import {
  encodeRangeToken,
  parseRangeToken,
  type Filter,
  type FilterRangePercentiles,
} from "./types";

type RangeBound = "min" | "max";

type PresetRow =
  | { kind: "value"; value: number; label: string }
  | { kind: "unbounded"; label: string };

export function FilterRangeHeader({
  label,
  onBack,
}: {
  label: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-1 px-2 pt-2">
      <button
        type="button"
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md p-2 text-neutral-500",
          "transition-[transform,color,background-color] duration-150 ease-out motion-reduce:transition-none",
          "hover:bg-neutral-900/5",
          "active:scale-[0.97] motion-reduce:active:scale-100",
        )}
        onClick={() => onBack()}
        aria-label="Back"
      >
        <ChevronLeft className="size-3 shrink-0" />
      </button>

      <span className="text-sm font-medium text-neutral-900">{label}</span>
    </div>
  );
}

function percentilePresetOptions(
  pct: FilterRangePercentiles,
  format: (n: number) => string,
): { value: number; label: string }[] {
  return [pct.p0, pct.p25, pct.p50, pct.p75, pct.p100].map((value) => ({
    value,
    label: format(value),
  }));
}

function RangeEndControl({
  bound,
  value,
  unboundedLabel,
  percentiles,
  formatBound,
  parseInput,
  onCommit,
  inputRef,
  onEmptyMinBackspace,
  onFocusNextField,
  onFocusPreviousField,
  onEscapeCloseFilter,
}: {
  bound: RangeBound;
  value: number | undefined;
  unboundedLabel: string;
  percentiles: FilterRangePercentiles | null;
  formatBound: (n: number) => string;
  parseInput: (raw: string) => number;
  onCommit: (next: number | undefined) => void;
  inputRef?: Ref<HTMLInputElement | null>;
  /** When set (min field only), Backspace on an empty input goes back to the filter list. */
  onEmptyMinBackspace?: () => void;
  /** Min field: caret at end + ArrowRight (presets closed) focuses the max field. */
  onFocusNextField?: () => void;
  /** Max field: collapsed caret at index 0 + ArrowLeft or Backspace (presets closed) focuses the min field. */
  onFocusPreviousField?: () => void;
  /** Escape (presets closed) closes the outer filter when the applied range has both bounds. */
  onEscapeCloseFilter?: () => void;
}) {
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [highlightedPresetIndex, setHighlightedPresetIndex] = useState<
    number | null
  >(null);
  const [draft, setDraft] = useState(() =>
    value != null ? String(value) : "",
  );

  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const inputElRef = useRef<HTMLInputElement | null>(null);
  const focusFieldAfterPresetCloseRef = useRef(false);

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputElRef.current = node;
      if (!inputRef) {
        return;
      }
      if (typeof inputRef === "function") {
        inputRef(node);
      } else {
        (inputRef as MutableRefObject<HTMLInputElement | null>).current = node;
      }
    },
    [inputRef],
  );

  useEffect(() => {
    setDraft(value != null ? String(value) : "");
  }, [value]);

  const flatPresets = useMemo((): PresetRow[] => {
    if (!percentiles) {
      return [];
    }
    const opts = percentilePresetOptions(percentiles, formatBound);
    return [
      ...opts.map((o) => ({
        kind: "value" as const,
        value: o.value,
        label: o.label,
      })),
      { kind: "unbounded" as const, label: unboundedLabel },
    ];
  }, [percentiles, formatBound, unboundedLabel]);

  const handlePresetsOpenChange = useCallback(
    (open: boolean) => {
      setPresetsOpen(open);
      if (open) {
        setHighlightedPresetIndex(flatPresets.length > 0 ? 0 : null);
      } else {
        setHighlightedPresetIndex(null);
      }
    },
    [flatPresets.length],
  );

  useEffect(() => {
    if (
      presetsOpen &&
      flatPresets.length > 0 &&
      highlightedPresetIndex == null
    ) {
      setHighlightedPresetIndex(0);
    }
  }, [presetsOpen, flatPresets.length, highlightedPresetIndex]);

  useLayoutEffect(() => {
    if (!presetsOpen || highlightedPresetIndex == null) {
      return;
    }
    optionRefs.current[highlightedPresetIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [highlightedPresetIndex, presetsOpen]);

  const commitDraft = useCallback(() => {
    const raw = draft.trim();
    if (raw === "") {
      onCommit(undefined);
      return;
    }
    const n = parseInput(raw);
    if (!Number.isFinite(n)) {
      setDraft(value != null ? String(value) : "");
      return;
    }
    onCommit(n);
  }, [draft, onCommit, parseInput, value]);

  const applyPresetIndex = useCallback(
    (idx: number) => {
      const row = flatPresets[idx];
      if (!row) {
        return;
      }
      if (row.kind === "unbounded") {
        onCommit(undefined);
        setDraft("");
      } else {
        onCommit(row.value);
        setDraft(String(row.value));
      }
    },
    [flatPresets, onCommit],
  );

  const applyPresetAndClose = useCallback(
    (idx: number) => {
      applyPresetIndex(idx);
      focusFieldAfterPresetCloseRef.current = true;
      handlePresetsOpenChange(false);
    },
    [applyPresetIndex, handlePresetsOpenChange],
  );

  const presetList = (
    <div
      id={`filter-range-listbox-${bound}`}
      role="listbox"
      aria-label={
        bound === "min"
          ? "Suggested minimum values"
          : "Suggested maximum values"
      }
      className="scrollbar-hide max-h-48 min-w-[var(--filter-range-preset-w)] overflow-y-auto p-1"
      style={
        {
          "--filter-range-preset-w": "min(92vw, 220px)",
        } as CSSProperties
      }
    >
      {!percentiles ? (
        <div className="px-2.5 py-3 text-center text-xs text-neutral-400">
          Loading…
        </div>
      ) : (
        flatPresets.map((row, idx) => (
          <button
            key={`${bound}-${row.kind}-${idx}`}
            id={`filter-range-option-${bound}-${idx}`}
            ref={(el) => {
              optionRefs.current[idx] = el;
            }}
            type="button"
            role="option"
            aria-selected={highlightedPresetIndex === idx}
            className={cn(
              "flex w-full rounded-md px-2.5 py-2 text-left text-sm outline-none",
              "transition-[background-color,color] duration-100 ease-out motion-reduce:transition-none",
              "active:scale-[0.99] motion-reduce:active:scale-100",
              row.kind === "unbounded"
                ? "text-neutral-500"
                : "font-medium text-neutral-900",
              highlightedPresetIndex === idx
                ? "bg-neutral-100"
                : "hover:bg-neutral-100 [@media(hover:none)]:hover:bg-transparent",
            )}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setHighlightedPresetIndex(idx)}
            onClick={() => {
              applyPresetAndClose(idx);
            }}
          >
            {row.label}
          </button>
        ))
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "border-subtle flex h-10 min-w-0 flex-1 items-stretch overflow-hidden rounded-lg border bg-white",
        "transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
        "focus-within:border-neutral-500 focus-within:ring-4 focus-within:ring-neutral-200",
      )}
    >
      <input
        ref={setInputRef}
        type="text"
        inputMode="decimal"
        role="combobox"
        aria-expanded={presetsOpen}
        aria-controls={
          presetsOpen ? `filter-range-listbox-${bound}` : undefined
        }
        aria-activedescendant={
          presetsOpen && flatPresets.length > 0
            ? `filter-range-option-${bound}-${highlightedPresetIndex ?? 0}`
            : undefined
        }
        aria-label={bound === "min" ? "Minimum value" : "Maximum value"}
        placeholder={unboundedLabel}
        id={`filter-range-input-${bound}`}
        className="min-w-0 flex-1 border-0 bg-transparent py-1 pl-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();

          if (e.key === "Backspace" && onEmptyMinBackspace && draft === "") {
            e.preventDefault();
            onEmptyMinBackspace();
            return;
          }

          const inputEl = e.currentTarget;
          const selStart = inputEl.selectionStart ?? 0;
          const selEnd = inputEl.selectionEnd ?? 0;
          const collapsed = selStart === selEnd;

          if (
            !presetsOpen &&
            bound === "min" &&
            e.key === "ArrowRight" &&
            onFocusNextField &&
            collapsed &&
            selStart === draft.length
          ) {
            e.preventDefault();
            onFocusNextField();
            return;
          }

          if (
            !presetsOpen &&
            bound === "max" &&
            (e.key === "ArrowLeft" || e.key === "Backspace") &&
            onFocusPreviousField &&
            collapsed &&
            selStart === 0
          ) {
            e.preventDefault();
            onFocusPreviousField();
            return;
          }

          if (e.key === "Escape" && presetsOpen) {
            e.preventDefault();
            handlePresetsOpenChange(false);
            return;
          }

          if (e.key === "Escape" && !presetsOpen && onEscapeCloseFilter) {
            e.preventDefault();
            onEscapeCloseFilter();
            return;
          }

          if (presetsOpen && e.key === " ") {
            e.preventDefault();
            if (flatPresets.length > 0) {
              applyPresetAndClose(highlightedPresetIndex ?? 0);
            }
            return;
          }

          if (
            !presetsOpen &&
            (e.key === " " ||
              e.key === "ArrowDown" ||
              (e.key === "ArrowUp" && flatPresets.length > 0))
          ) {
            e.preventDefault();
            handlePresetsOpenChange(true);
            if (e.key === "ArrowUp" && flatPresets.length > 0) {
              setHighlightedPresetIndex(flatPresets.length - 1);
            }
            return;
          }

          if (presetsOpen && flatPresets.length > 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightedPresetIndex((i) => {
                const cur = i ?? 0;
                return Math.min(cur + 1, flatPresets.length - 1);
              });
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightedPresetIndex((i) => {
                const cur = i ?? 0;
                return Math.max(cur - 1, 0);
              });
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              applyPresetAndClose(highlightedPresetIndex ?? 0);
              return;
            }
          }

          if (e.key === "Enter") {
            e.preventDefault();
            commitDraft();
            handlePresetsOpenChange(false);
          }
        }}
        onBlur={() => {
          commitDraft();
        }}
      />
      <Popover
        openPopover={presetsOpen}
        setOpenPopover={handlePresetsOpenChange}
        content={presetList}
        align="end"
        popoverContentClassName="p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => {
          if (!focusFieldAfterPresetCloseRef.current) {
            return;
          }
          focusFieldAfterPresetCloseRef.current = false;
          e.preventDefault();
          if (bound === "min") {
            onFocusNextField?.();
          } else {
            const el = inputElRef.current;
            if (el) {
              queueMicrotask(() => {
                el.focus();
                const len = el.value.length;
                el.setSelectionRange(len, len);
              });
            }
          }
        }}
      >
        <button
          type="button"
          className={cn(
            "flex h-full shrink-0 items-center justify-center px-2 text-neutral-500",
            "transition-[transform,color,background-color] duration-150 ease-out motion-reduce:transition-none",
            "hover:bg-neutral-50 hover:text-neutral-800 [@media(hover:none)]:hover:bg-transparent",
            "active:scale-[0.97] motion-reduce:active:scale-100",
          )}
          aria-label="Choose a preset value"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => handlePresetsOpenChange(!presetsOpen)}
        >
          <ChevronDown className="size-4" />
        </button>
      </Popover>
    </div>
  );
}

export function FilterRangePanel({
  filter,
  activeToken,
  onApply,
  onNavigateBack,
  onCloseFilter,
}: {
  filter: Filter;
  activeToken: string | undefined;
  onApply: (token: string) => void;
  onNavigateBack: () => void;
  /** When the applied range has both min and max, Escape closes the outer filter instead of going back. */
  onCloseFilter?: () => void;
}) {
  const { min, max } = parseRangeToken(activeToken);
  const rangeFullyApplied = min != null && max != null;
  const format =
    filter.formatRangeBound ?? ((n: number) => String(Math.trunc(n)));
  const parse =
    filter.parseRangeInput ??
    ((raw: string) => {
      const n = Number.parseInt(raw.replace(/[^\d-]/g, ""), 10);
      return Number.isFinite(n) ? n : Number.NaN;
    });

  const commitBoth = useCallback(
    (nextMin?: number, nextMax?: number) => {
      const t = encodeRangeToken(nextMin, nextMax);
      onApply(t);
    },
    [onApply],
  );

  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);

  const focusMinAtEnd = useCallback(() => {
    const el = minInputRef.current;
    if (!el) {
      return;
    }
    el.focus();
    const len = el.value.length;
    queueMicrotask(() => {
      el.setSelectionRange(len, len);
    });
  }, []);

  const focusMaxAtStart = useCallback(() => {
    const el = maxInputRef.current;
    if (!el) {
      return;
    }
    el.focus();
    queueMicrotask(() => {
      el.setSelectionRange(0, 0);
    });
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      minInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="flex w-full min-w-[282px] max-w-[282px] flex-col gap-3 p-2"
      onKeyDownCapture={(e) => {
        if (e.key !== "Backspace" && e.key !== "Delete") {
          return;
        }
        const t = e.target as HTMLElement;
        if (t.closest("input, textarea, [contenteditable=true]")) {
          return;
        }
        e.preventDefault();
        onNavigateBack();
      }}
    >
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <RangeEndControl
            bound="min"
            value={min}
            unboundedLabel="No min"
            percentiles={filter.rangePercentiles ?? null}
            formatBound={format}
            parseInput={parse}
            onCommit={(next) => commitBoth(next, max)}
            inputRef={minInputRef}
            onEmptyMinBackspace={onNavigateBack}
            onFocusNextField={focusMaxAtStart}
            onEscapeCloseFilter={rangeFullyApplied ? onCloseFilter : undefined}
          />
        </div>

        <span className="shrink-0 pb-2.5 text-xs text-neutral-500">to</span>

        <div className="min-w-0 flex-1">
          <RangeEndControl
            bound="max"
            value={max}
            unboundedLabel="No max"
            percentiles={filter.rangePercentiles ?? null}
            formatBound={format}
            parseInput={parse}
            onCommit={(next) => commitBoth(min, next)}
            inputRef={maxInputRef}
            onFocusPreviousField={focusMinAtEnd}
            onEscapeCloseFilter={rangeFullyApplied ? onCloseFilter : undefined}
          />
        </div>
      </div>
    </div>
  );
}
