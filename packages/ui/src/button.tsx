import { cn } from "@dub/utils";
import { ReactNode } from "react";
import { LoadingSpinner } from "./icons";
import { Tooltip } from "./tooltip";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "success"
    | "danger"
    | "danger-outline";
  loading?: boolean;
  icon?: ReactNode;
  shortcut?: string;
  disabledTooltip?: string | ReactNode;
}

export function Button({
  text,
  variant = "primary",
  className,
  loading,
  icon,
  shortcut,
  disabledTooltip,
  ...props
}: ButtonProps) {
  if (disabledTooltip) {
    return (
      <Tooltip content={disabledTooltip}>
        <div
          className={cn(
            "flex h-10 w-full cursor-not-allowed items-center justify-center space-x-2 rounded-md border border-gray-200 bg-gray-100 px-4 text-sm text-gray-400 transition-all focus:outline-none",
            {
              "border-transparent bg-transparent": variant.endsWith("outline"),
            },
            className,
          )}
        >
          {icon}
          <p className={cn(shortcut && "flex-1 text-left")}>{text}</p>
          {shortcut && (
            <kbd
              className={cn(
                "hidden rounded bg-gray-200 px-2 py-0.5 text-xs font-light text-gray-400 md:inline-block",
                {
                  "bg-gray-100": variant.endsWith("outline"),
                },
              )}
            >
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
              "border-transparent text-gray-500 duration-75 hover:bg-gray-100":
                variant === "outline",
              "border-blue-500 bg-blue-500 text-white hover:bg-white hover:text-blue-500":
                variant === "success",
              "border-red-500 bg-red-500 text-white hover:bg-white hover:text-red-500":
                variant === "danger",
              "border-transparent bg-white text-red-500 hover:bg-red-600 hover:text-white":
                variant === "danger-outline",
            },
        className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <LoadingSpinner /> : icon ? icon : null}
      {text && <p className={cn(shortcut && "flex-1 text-left")}>{text}</p>}
      {shortcut && (
        <kbd
          className={cn(
            "hidden rounded px-2 py-0.5 text-xs font-light transition-all duration-75 md:inline-block",
            {
              "bg-gray-700 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-500":
                variant === "primary",
              "bg-gray-200 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-500":
                variant === "secondary",
              "bg-gray-100 text-gray-500 group-hover:bg-gray-200":
                variant === "outline",
              "bg-red-100 text-red-600 group-hover:bg-red-500 group-hover:text-white":
                variant === "danger-outline",
            },
          )}
        >
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
