import { formatDateTime, getDateTimeLocal, parseDateTime } from "@dub/utils";
import { useEffect, useId, useRef } from "react";

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

  // Hacky fix to focus the input automatically, not sure why autoFocus doesn't work here
  useEffect(() => {
    if (inputRef.current && autoFocus) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [autoFocus]);

  return (
    <div className={className}>
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
      <div className="mt-2 flex w-full items-center justify-between rounded-md border border-neutral-300 bg-white shadow-sm transition-all focus-within:border-neutral-800 focus-within:outline-none focus-within:ring-1 focus-within:ring-neutral-500">
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
          className="flex-1 border-none bg-transparent text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
        />
        <input
          type="datetime-local"
          id={`${id}-datetime-local`}
          required={required}
          value={value ? getDateTimeLocal(value) : ""}
          onChange={(e) => {
            const date = new Date(e.target.value);
            onChange(date);
            if (inputRef.current) {
              inputRef.current.value = formatDateTime(date);
            }
          }}
          className="w-[40px] border-none bg-transparent text-neutral-500 focus:outline-none focus:ring-0 sm:text-sm"
        />
      </div>
    </div>
  );
}
