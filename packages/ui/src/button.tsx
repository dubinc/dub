"use client";

import { cn } from "@dub/utils";
import { ReactNode } from "react";
import { LoadingSpinner } from "./icons";
import { Tooltip } from "./tooltip";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  variant?: "primary" | "secondary" | "success" | "danger";
  loading?: boolean;
  icon?: ReactNode;
  disabledTooltip?: string | ReactNode;
}

export function Button({
  text,
  variant = "primary",
  loading,
  icon,
  disabledTooltip,
  ...props
}: ButtonProps) {
  if (disabledTooltip) {
    return (
      <Tooltip content={disabledTooltip}>
        <div className="flex h-10 w-full cursor-not-allowed items-center justify-center rounded-md border border-gray-200 bg-gray-100 px-4 text-sm text-gray-400 transition-all focus:outline-none">
          <p>{text}</p>
        </div>
      </Tooltip>
    );
  }
  return (
    <button
      // if onClick is passed, it's a "button" type, otherwise it's being used in a form, hence "submit"
      type={props.onClick ? "button" : "submit"}
      className={cn(
        "flex h-10 w-full items-center justify-center space-x-2 rounded-md border px-4 text-sm transition-all focus:outline-none",
        props.disabled || loading
          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
          : {
              "border-black bg-black text-white hover:bg-white hover:text-black":
                variant === "primary",
              "border-gray-200 bg-white text-gray-500 hover:border-black hover:text-black":
                variant === "secondary",
              "border-blue-500 bg-blue-500 text-white hover:bg-white hover:text-blue-500":
                variant === "success",
              "border-red-500 bg-red-500 text-white hover:bg-white hover:text-red-500":
                variant === "danger",
            },
        props.className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <LoadingSpinner /> : icon ? icon : null}
      <p>{text}</p>
    </button>
  );
}
