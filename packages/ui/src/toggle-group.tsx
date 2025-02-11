"use client";

import { cn } from "@dub/utils";
import { LayoutGroup, motion } from "framer-motion";
import { useId } from "react";

interface ToggleOption {
  value: string;
  label: string | React.ReactNode;
  badge?: React.ReactNode;
}

export function ToggleGroup({
  options,
  selected,
  selectAction,
  className,
  optionClassName,
  indicatorClassName,
  style,
}: {
  options: ToggleOption[];
  selected: string | null;
  selectAction: (option: string) => void;
  className?: string;
  optionClassName?: string;
  indicatorClassName?: string;
  style?: React.CSSProperties;
}) {
  const layoutGroupId = useId();

  return (
    <LayoutGroup id={layoutGroupId}>
      <motion.div
        layout
        className={cn(
          "relative inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1",
          className,
        )}
        style={style}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              "relative z-10 flex items-center gap-2 px-3 py-1 text-sm font-medium capitalize",
              {
                "z-[11] transition-colors hover:text-neutral-500":
                  option.value !== selected,
              },
              optionClassName,
            )}
            onClick={() => selectAction(option.value)}
          >
            {typeof option.label === "string" ? (
              <p>{option.label}</p>
            ) : (
              option.label
            )}
            {option.badge}
            {option.value === selected && (
              <motion.div
                layoutId={layoutGroupId}
                className={cn(
                  "absolute left-0 top-0 -z-[1] h-full w-full rounded-lg border border-neutral-200 bg-neutral-50",
                  indicatorClassName,
                )}
                transition={{ duration: 0.25 }}
              />
            )}
          </button>
        ))}
      </motion.div>
    </LayoutGroup>
  );
}
