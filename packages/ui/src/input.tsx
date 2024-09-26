import { cn } from "@dub/utils";
import { AlertCircle, EyeIcon, EyeOffIcon } from "lucide-react";
import React, { useCallback, useState } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const toggleIsPasswordVisible = useCallback(
      () => setIsPasswordVisible(!isPasswordVisible),
      [isPasswordVisible, setIsPasswordVisible],
    );

    return (
      <div>
        <div className="relative flex">
          <input
            type={isPasswordVisible ? "text" : type}
            className={cn(
              "w-full max-w-md rounded-md border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
              props.error &&
                "border-red-500 focus:border-red-500 focus:ring-red-500",
              className,
            )}
            ref={ref}
            {...props}
          />

          {props.error ? (
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <AlertCircle className="size-5 flex-none text-white" fill="red" />
            </div>
          ) : type === "password" ? (
            <button
              className="absolute inset-y-0 right-0 flex items-center rounded-lg px-2.5"
              type="button"
              onClick={() => toggleIsPasswordVisible()}
              aria-label={isPasswordVisible ? "Hide password" : "Show Password"}
            >
              {isPasswordVisible ? (
                <EyeIcon
                  className="size-4 flex-none text-gray-500 transition hover:text-gray-700"
                  aria-hidden
                />
              ) : (
                <EyeOffIcon
                  className="size-4 flex-none text-gray-500 transition hover:text-gray-700"
                  aria-hidden
                />
              )}
            </button>
          ) : null}
        </div>

        {props.error && (
          <span
            className="mt-2 block text-sm text-red-500"
            role="alert"
            aria-live="assertive"
          >
            {props.error}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
