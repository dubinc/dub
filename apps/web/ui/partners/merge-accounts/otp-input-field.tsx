import { cn } from "@dub/utils";
import { OTPInput } from "input-otp";

interface OTPInputFieldProps {
  value: string;
  onChange: (code: string) => void;
  label: string;
}

export function OTPInputField({ value, onChange, label }: OTPInputFieldProps) {
  return (
    <div>
      <label className="text-sm font-medium leading-5 text-neutral-900">
        {label}
      </label>
      <div className="relative mt-2">
        <OTPInput
          maxLength={6}
          value={value}
          onChange={onChange}
          render={({ slots }) => (
            <div className="flex w-full items-center justify-between">
              {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "relative flex h-14 w-12 items-center justify-center text-xl",
                    "rounded-lg border border-neutral-200 bg-white ring-0 transition-all",
                    isActive &&
                      "z-10 border border-neutral-800 ring-2 ring-neutral-200",
                    // isInvalidCode && "border-red-500 ring-red-200",
                  )}
                >
                  {char}
                  {hasFakeCaret && (
                    <div className="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-5 w-px bg-black" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        />
      </div>
    </div>
  );
}
