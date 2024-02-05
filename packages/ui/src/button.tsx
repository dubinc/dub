"use client";

import { cn } from "@dub/utils";
import { ReactNode } from "react";
import { LoadingSpinner } from "./icons";
import { Tooltip } from "./tooltip";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  variant?: "primary" | "secondary" | "outline" | "success" | "danger";
  loading?: boolean;
  icon?: ReactNode;
  shortcut?: string;
  disabledTooltip?: string | ReactNode;
}

export function Button({
  text,
  variant = "primary",
  loading,
  icon,
  shortcut,
  disabledTooltip,
  ...props
}: ButtonProps) {
  if (disabledTooltip) {
    return (
      <Tooltip content={disabledTooltip}>
        <div className="flex h-10 w-full cursor-not-allowed items-center justify-center space-x-2 rounded-md border border-gray-200 bg-gray-100 px-4 text-sm text-gray-400 transition-all focus:outline-none">
          <p>{text}</p>
          {shortcut && (
            <kbd className="hidden rounded bg-zinc-200 px-2 py-0.5 text-xs font-light text-gray-400 md:inline-block">
              {shortcut}
            </kbd>
          )}
        </div>
      </Tooltip>
    );
  }
  return (
    <button
      // if onClick is passed, it's a "button" type, otherwise it's being used in a form, hence "submit"
      type={props.onClick ? "button" : "submit"}
      className={cn(
        "group flex h-10 w-full items-center justify-center space-x-2 rounded-md border px-4 text-sm transition-all",
        props.disabled || loading
          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
          : {
              "border-black bg-black text-white hover:bg-white hover:text-black":
                variant === "primary",
              "border-gray-200 bg-white text-gray-600 hover:bg-gray-100":
                variant === "secondary",
              "border-transparent text-gray-500 transition-all duration-75 hover:bg-gray-100":
                variant === "outline",
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
      {text && <p>{text}</p>}
      {shortcut && (
        <kbd className="hidden rounded bg-zinc-700 px-2 py-0.5 text-xs font-light text-gray-400 transition-all duration-75 group-hover:bg-gray-100 group-hover:text-gray-500 md:inline-block">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
