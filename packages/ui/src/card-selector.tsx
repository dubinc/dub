"use client";

import { cn } from "@dub/utils";
import { ReactNode } from "react";
import { AnimatedSizeContainer } from "./animated-size-container";
import { CircleCheckFill } from "./icons";

export interface CardSelectorOption {
  key: string;
  label: string;
  description: string;
  icon?: ReactNode;
}

export interface CardSelectorProps {
  options: CardSelectorOption[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  gridCols?: "1" | "2" | "3";
  name?: string;
  disabled?: boolean;
  animated?: boolean;
}

export function CardSelector({
  options,
  value,
  onChange,
  className,
  gridCols = "2",
  name,
  disabled = false,
  animated = true,
}: CardSelectorProps) {
  const gridClass = {
    "1": "grid-cols-1",
    "2": "grid-cols-1 lg:grid-cols-2",
    "3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  }[gridCols];

  const content = (
    <div className={cn("grid gap-3", gridClass)}>
      {options.map(({ key, label, description, icon }) => {
        const isSelected = value === key;

        return (
          <label
            key={key}
            className={cn(
              "relative flex w-full cursor-pointer items-start rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
              "transition-all duration-150",
              isSelected &&
                "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
              disabled && "cursor-not-allowed opacity-50",
              className,
            )}
          >
            <input
              type="radio"
              name={name}
              value={key}
              className="hidden"
              checked={isSelected}
              disabled={disabled}
              onChange={(e) => {
                if (e.target.checked && onChange) {
                  onChange(key);
                }
              }}
            />

            {icon && <div className="flex-shrink-0 pt-0.5">{icon}</div>}

            <div className="flex grow flex-col p-3 pr-0">
              <span className="pr-1 text-sm font-semibold text-neutral-900">
                {label}
              </span>
              <span className="text-xs text-neutral-600">{description}</span>
            </div>

            <CircleCheckFill
              className={cn(
                "mr-1.5 mt-1.5 flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                isSelected && "scale-100 opacity-100",
              )}
            />
          </label>
        );
      })}
    </div>
  );

  if (!animated) {
    return content;
  }

  return (
    <div className="-m-1">
      <AnimatedSizeContainer
        height
        transition={{ ease: "easeInOut", duration: 0.2 }}
      >
        <div className="p-1">{content}</div>
      </AnimatedSizeContainer>
    </div>
  );
}
