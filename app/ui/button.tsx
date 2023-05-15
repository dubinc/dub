"use client";

import { LoadingDots } from "#/ui/icons";
import Tooltip from "#/ui/tooltip";
import clsx from "clsx";
import { ReactNode } from "react";

export default function Button({
  text,
  variant = "primary",
  onClick,
  disabled,
  loading,
  disabledTooltip,
}: {
  text: string;
  variant?: "primary" | "secondary" | "danger";
  onClick?: any;
  disabled?: boolean;
  loading?: boolean;
  disabledTooltip?: string | ReactNode;
}) {
  if (disabledTooltip) {
    return (
      <Tooltip content={disabledTooltip} fullWidth>
        <div className="flex h-10 w-full cursor-not-allowed items-center justify-center rounded-md border border-gray-200 bg-gray-100 text-sm text-gray-400 transition-all focus:outline-none">
          <p>{text}</p>
        </div>
      </Tooltip>
    );
  }
  return (
    <button
      // if onClick is passed, it's a "button" type, otherwise it's being used in a form, hence "submit"
      type={onClick ? "button" : "submit"}
      className={clsx(
        "flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none",
        disabled || loading
          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
          : {
              "border-black bg-black text-white hover:bg-white hover:text-black":
                variant === "primary",
              "border-gray-200 bg-white text-gray-500 hover:border-black hover:text-black":
                variant === "secondary",
              "border-red-500 bg-red-500 text-white hover:bg-white hover:text-red-500":
                variant === "danger",
            },
      )}
      {...(onClick ? { onClick } : {})}
      disabled={disabled || loading}
    >
      {loading ? <LoadingDots color="#808080" /> : <p>{text}</p>}
    </button>
  );
}
