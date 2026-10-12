import { cn } from "@dub/utils";
import { HTMLAttributes, KeyboardEvent } from "react";

// Number inputs accept "e" and "+" for scientific notation, which a lead form never needs
export const blockNonNumericKeys = (e: KeyboardEvent<HTMLInputElement>) => {
  if (["e", "E", "+"].includes(e.key)) {
    e.preventDefault();
  }
};

export const requiredFieldRule = (required: boolean) =>
  required ? "Please fill in this field" : false;

export const maxLengthRule = (maxLength?: number) =>
  maxLength
    ? {
        value: maxLength,
        message: `Please enter at most ${maxLength} characters`,
      }
    : undefined;

export type FormControlProps = {
  label: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  labelDir?: string;
} & HTMLAttributes<HTMLLabelElement>;

export const FormControlRequiredBadge = () => {
  return (
    <span className="min-h-4 rounded-md bg-orange-100 px-1 text-xs font-semibold text-orange-600">
      Required
    </span>
  );
};

export const FormControl = ({
  label,
  required,
  children,
  error,
  helperText,
  labelDir,
  ...rest
}: FormControlProps) => {
  return (
    <label {...rest}>
      <div className="flex items-center gap-1" dir={labelDir}>
        <span className="text-content-emphasis text-sm font-medium">
          {label}
        </span>
        {required && <FormControlRequiredBadge />}
      </div>

      <div className="mt-2">
        {children}

        {(error || helperText) && (
          <div
            className={cn(
              "mt-2 text-xs",
              error ? "text-red-500" : "text-neutral-500",
            )}
          >
            {error || helperText}
          </div>
        )}
      </div>
    </label>
  );
};
