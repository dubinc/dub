import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";

export type FormControlProps = PropsWithChildren<{
  label: string;
  required?: boolean;
  helperText?: string;
  error?: string;
}>;

export const FormControl = ({
  label,
  required,
  children,
  error,
  helperText,
}: FormControlProps) => {
  return (
    <label>
      <div className="flex items-center gap-1.5">
        <span className="text-content-emphasis text-sm font-medium">
          {label}
        </span>
        {required && (
          <span className="min-h-4 rounded-md bg-orange-100 px-1 text-xs font-semibold text-orange-600">
            Required
          </span>
        )}
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
