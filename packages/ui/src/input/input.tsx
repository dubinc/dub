import { cn } from "@dub/utils";
import { InputHTMLAttributes, ReactNode, forwardRef, useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    const id = useId();
    const errorId = error ? `${id}-error` : undefined;

    return (
      <div>
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={id}
              className="block text-sm font-medium text-gray-700"
            >
              {label}
            </label>
          )}
          {error && (
            <p className="text-sm text-red-600" id={errorId}>
              {error}
            </p>
          )}
        </div>
        <div className="relative mt-1 flex rounded-md shadow-sm">
          <input
            ref={ref}
            id={id}
            className={cn(
              error
                ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500",
              "block w-full rounded-md focus:outline-none sm:text-sm",
              className,
            )}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={errorId}
            {...props}
          />
          {/* {error && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <AlertCircleFill
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            </div>
          )} */}
        </div>
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
