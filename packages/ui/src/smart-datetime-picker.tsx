import {
  cn,
  formatDateTime,
  getDateTimeLocal,
  parseDateTime,
} from "@dub/utils";
import { useEffect, useId, useRef } from "react";
import { CalendarIcon } from "./icons";

interface SmartDateTimePickerProps {
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
}

export function SmartDateTimePicker({
  value,
  onChange,
  label,
  placeholder = 'E.g. "tomorrow at 5pm" or "in 2 hours"',
  className,
  required,
  autoFocus = false,
}: SmartDateTimePickerProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  // Opens the browser's own date/time popover for the (visually hidden) native input
  const openNativePicker = () => {
    const input = nativeInputRef.current;
    if (!input) return;

    // Safari only dismisses the picker when its input loses focus, so the input
    // has to be focused first or the picker can't be closed
    input.focus();

    try {
      input.showPicker();
    } catch {
      // Browsers without showPicker support: the focused input still takes keyboard entry
    }
  };

  // Hacky fix to focus the input automatically, not sure why autoFocus doesn't work here
  useEffect(() => {
    if (inputRef.current && autoFocus) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [autoFocus]);

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-center gap-2">
          <label
            htmlFor={`${id}-datetime`}
            className="block text-sm font-medium text-neutral-700"
          >
            {label}
          </label>
        </div>
      )}
      <div
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-neutral-300 bg-white shadow-sm transition-all focus-within:border-neutral-800 focus-within:outline-none focus-within:ring-1 focus-within:ring-neutral-500",
          className,
        )}
      >
        <input
          ref={inputRef}
          id={`${id}-datetime`}
          type="text"
          placeholder={placeholder}
          defaultValue={value ? formatDateTime(value) : ""}
          onBlur={(e) => {
            if (e.target.value.length > 0) {
              const parsedDateTime = parseDateTime(e.target.value);
              if (parsedDateTime) {
                onChange(parsedDateTime);
                e.target.value = formatDateTime(parsedDateTime);
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && inputRef.current) {
              e.preventDefault();
              const parsedDateTime = parseDateTime(inputRef.current.value);
              if (parsedDateTime) {
                onChange(parsedDateTime);
                inputRef.current.value = formatDateTime(parsedDateTime);
              }
            }
          }}
          className="min-w-0 flex-1 border-none bg-transparent text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
        />
        <div className="relative shrink-0 self-stretch">
          <button
            type="button"
            onClick={openNativePicker}
            aria-label="Open date picker"
            className="flex h-full items-center px-3 text-neutral-500 transition-colors hover:text-neutral-700 focus:outline-none"
          >
            <CalendarIcon className="size-4 flex-none" aria-hidden />
          </button>
          {/* Kept in the layout (but invisible) so the native popover anchors to the icon */}
          <input
            ref={nativeInputRef}
            type="datetime-local"
            id={`${id}-datetime-local`}
            required={required}
            tabIndex={-1}
            aria-label="Date and time"
            value={value ? getDateTimeLocal(value) : ""}
            onChange={(e) => {
              const date = new Date(e.target.value);
              onChange(date);
              if (inputRef.current) {
                inputRef.current.value = formatDateTime(date);
              }
            }}
            className="pointer-events-none absolute inset-0 size-full opacity-0"
          />
        </div>
      </div>
    </div>
  );
}
