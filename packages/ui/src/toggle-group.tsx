"use client";

import { cn } from "@dub/utils";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useId } from "react";

interface ToggleOption {
  value: string;
  label: string | React.ReactNode;
  badge?: React.ReactNode;
  href?: string;
}

export function ToggleGroup({
  options,
  selected,
  selectAction,
  layout = true,
  className,
  optionClassName,
  indicatorClassName,
  style,
}: {
  options: ToggleOption[];
  selected: string | null;
  selectAction?: (option: string) => void;
  layout?: boolean;
  className?: string;
  optionClassName?: string;
  indicatorClassName?: string;
  style?: React.CSSProperties;
}) {
  const layoutGroupId = useId();

  return (
    <LayoutGroup id={layoutGroupId}>
      <motion.div
        layout={layout}
        className={cn(
          "border-border-subtle bg-bg-default relative z-0 inline-flex items-center gap-1 rounded-xl border p-1",
          className,
        )}
        style={style}
      >
        {options.map((option) => {
          const isSelected = option.value === selected;
          const As = option.href ? Link : "button";
          return (
            // @ts-ignore dynamic props :(
            <As
              key={option.value}
              {...(option.href ? { href: option.href } : { type: "button" })}
              data-selected={isSelected}
              className={cn(
                "text-content-emphasis relative z-10 flex items-center gap-2 px-3 py-1 text-sm font-medium capitalize",
                !isSelected &&
                  "hover:text-content-subtle z-[11] transition-colors",
                optionClassName,
              )}
              onClick={() => selectAction?.(option.value)}
            >
              {typeof option.label === "string" ? (
                <p>{option.label}</p>
              ) : (
                option.label
              )}
              {option.badge}
              {isSelected && (
                <motion.div
                  layoutId={layoutGroupId}
                  className={cn(
                    "border-border-subtle bg-bg-muted absolute left-0 top-0 -z-[1] h-full w-full rounded-lg border",
                    indicatorClassName,
                  )}
                  transition={{ duration: 0.25 }}
                />
              )}
            </As>
          );
        })}
      </motion.div>
    </LayoutGroup>
  );
}
