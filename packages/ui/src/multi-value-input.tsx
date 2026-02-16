"use client";

import { cn } from "@dub/utils";
import { X } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/**
 * Parses CSV-like pasted text: splits on commas and newlines, and respects
 * double-quoted fields (commas/newlines inside quotes are kept).
 */
function parseCsvLikeValues(raw: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];

    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && (c === "," || c === "\n" || c === "\r")) {
      // Treat \r\n as single newline
      if (c === "\r" && raw[i + 1] === "\n") i++;
      const trimmed = current.trim();
      if (trimmed) result.push(trimmed);
      current = "";
      continue;
    }

    current += c;
  }

  const trimmed = current.trim();
  if (trimmed) result.push(trimmed);
  return result;
}

export interface MultiValueInputRef {
  /** Commits any pending input, updates parent, and returns the full list. */
  commitPendingInput: () => string[];
}

export interface MultiValueInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Optional normalizer for each value when adding (e.g. trim + lowercase). */
  normalize?: (value: string) => string;
  /** Optional max number of values (no limit if omitted). */
  maxValues?: number;
}

const MultiValueInput = React.forwardRef<
  MultiValueInputRef,
  MultiValueInputProps
>(function MultiValueInput(
  {
    values,
    onChange,
    placeholder,
    id,
    className,
    inputClassName,
    disabled,
    normalize = (v) => v.trim(),
    maxValues,
    autoFocus,
  },
  ref,
) {
  const [inputValue, setInputValue] = useState("");
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isWrapped, setIsWrapped] = useState(false);

  const addValues = useCallback(
    (candidates: string[]) => {
      const normalized = candidates.map(normalize).filter(Boolean);
      if (normalized.length === 0) return values;
      const next = [...values];
      for (const v of normalized) {
        if (maxValues != null && next.length >= maxValues) break;
        next.push(v);
      }
      return next;
    },
    [values, normalize, maxValues],
  );

  /** Deduplicate preserving first occurrence order; used only on blur. */
  const deduplicateValues = useCallback((list: string[]): string[] => {
    const seen = new Set<string>();
    return list.filter((v) => {
      if (seen.has(v)) return false;
      seen.add(v);
      return true;
    });
  }, []);

  const commitPendingInput = useCallback((): string[] => {
    const parsed = parseCsvLikeValues(inputValue);
    if (parsed.length === 0) {
      setInputValue("");
      return values;
    }
    const next = addValues(parsed);
    onChange(next);
    setInputValue("");
    return next;
  }, [inputValue, values, addValues, onChange]);

  useImperativeHandle(
    ref,
    () => ({
      commitPendingInput() {
        return commitPendingInput();
      },
    }),
    [commitPendingInput],
  );

  // Clear selection when the selected value is removed from the list
  useEffect(() => {
    if (selectedValue && !values.includes(selectedValue)) {
      setSelectedValue(null);
    }
  }, [values, selectedValue]);

  // ResizeObserver for wrapped layout
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkWrapped = () => {
      const children = Array.from(container.children) as HTMLElement[];
      if (children.length <= 1) {
        setIsWrapped(false);
        return;
      }
      const tops = children.map((el) => el.offsetTop);
      const firstRowTop = Math.min(...tops);
      setIsWrapped(tops.some((top) => top - firstRowTop > 2));
    };

    checkWrapped();
    const observer = new ResizeObserver(checkWrapped);
    observer.observe(container);
    return () => observer.disconnect();
  }, [values, inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const selectedIndex = selectedValue ? values.indexOf(selectedValue) : -1;

    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      commitPendingInput();
      return;
    }

    if (e.key === "ArrowLeft" && values.length > 0) {
      if (selectedIndex > 0) {
        e.preventDefault();
        setSelectedValue(values[selectedIndex - 1]);
        return;
      }
      if (
        selectedIndex === -1 &&
        inputEl.selectionStart === 0 &&
        inputEl.selectionEnd === 0
      ) {
        e.preventDefault();
        setSelectedValue(values[values.length - 1]);
        return;
      }
    }

    if (e.key === "ArrowRight" && selectedIndex !== -1) {
      e.preventDefault();
      if (selectedIndex < values.length - 1) {
        setSelectedValue(values[selectedIndex + 1]);
        return;
      }
      setSelectedValue(null);
      return;
    }

    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      !inputValue &&
      values.length > 0
    ) {
      e.preventDefault();
      if (selectedValue) {
        const next = values.filter((v) => v !== selectedValue);
        onChange(next);
        setSelectedValue(null);
        return;
      }
      setSelectedValue(values[values.length - 1]);
    }

    if (e.key === "Tab" && selectedValue) {
      e.preventDefault();
      setSelectedValue(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    const hasDelimiter = /[,\n\r]/.test(pasted);
    if (!hasDelimiter) return;

    const parsed = parseCsvLikeValues(pasted);
    if (parsed.length === 0) return;

    e.preventDefault();
    const next = addValues(parsed);
    onChange(next);
    setInputValue("");
  };

  const handleBlur = () => {
    setSelectedValue(null);
    const afterCommit = commitPendingInput();
    const deduped = deduplicateValues(afterCommit);
    if (deduped.length !== afterCommit.length) {
      onChange(deduped);
    }
  };

  const removeValue = (value: string) => {
    setSelectedValue((prev) => (prev === value ? null : prev));
    onChange(values.filter((v) => v !== value));
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex w-full flex-wrap items-center gap-1 rounded-md border border-neutral-300 bg-white px-1.5 shadow-sm focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500",
        isWrapped ? "py-[4px]" : "h-[38px] py-[3px]",
        disabled && "cursor-not-allowed bg-neutral-50 opacity-60",
        className,
      )}
    >
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          onClick={() => setSelectedValue(value)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md py-0.5 pl-1.5 pr-1 text-sm leading-6",
            selectedValue === value
              ? "bg-neutral-300 text-neutral-900"
              : "bg-neutral-100 text-neutral-900",
          )}
        >
          <span>{value}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeValue(value);
            }}
            disabled={disabled}
            className={cn(
              "rounded-md p-0.5 outline-none transition hover:bg-neutral-200 focus:ring-1 focus:ring-neutral-400",
              selectedValue === value
                ? "text-neutral-600 hover:text-neutral-800"
                : "text-neutral-500 hover:text-neutral-700",
            )}
            aria-label={`Remove ${value}`}
          >
            <X className="size-3" strokeWidth={2.5} aria-hidden />
          </button>
        </span>
      ))}
      <div className="min-w-[8rem] flex-[1_1_8rem]">
        <input
          ref={inputRef}
          id={id}
          value={inputValue}
          onChange={(e) => {
            setSelectedValue(null);
            setInputValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            "h-7 w-full border-0 bg-transparent px-1.5 text-sm leading-6 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0",
            selectedValue &&
              "text-transparent caret-transparent placeholder:text-transparent",
            inputClassName,
          )}
          placeholder={placeholder}
          type="text"
          autoComplete="off"
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
});

MultiValueInput.displayName = "MultiValueInput";

export { MultiValueInput };
