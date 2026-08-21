"use client";

import { cn, truncate } from "@dub/utils";
import { ComponentType, isValidElement, SVGProps } from "react";
import { Check } from "../icons";
import { Filter, FilterOption } from "./types";

type FilterOptionRowProps = {
  filter: Filter;
  option: FilterOption;
  checked: boolean;
  onToggle: () => void;
  className?: string;
};

export function FilterOptionRow({
  filter,
  option,
  checked,
  onToggle,
  className,
}: FilterOptionRowProps) {
  const Icon =
    option.icon ??
    filter.getOptionIcon?.(option.value, { key: filter.key, option });

  const label =
    option.label ??
    filter.getOptionLabel?.(option.value, { key: filter.key, option }) ??
    String(option.value);

  return (
    <button
      type="button"
      disabled={option.disabled}
      onClick={onToggle}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 whitespace-nowrap rounded-md px-2 py-2 text-left text-xs font-medium text-neutral-600",
        "transition-all duration-75",
        "hover:bg-neutral-100 active:bg-neutral-200",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          checked ? "border-neutral-900 bg-neutral-900" : "border-neutral-300",
        )}
      >
        {checked && <Check className="h-3 w-3 text-white" />}
      </div>
      {Icon && (
        <span className="shrink-0 text-neutral-500 [&_svg]:size-4">
          {renderFilterIcon(Icon)}
        </span>
      )}
      {label ? (
        <span className="min-w-0 flex-1">{truncate(label, 48)}</span>
      ) : (
        <div className="h-4 w-20 animate-pulse rounded-lg bg-neutral-200" />
      )}
      {option.right != null && (
        <span className="shrink-0 text-xs font-medium tabular-nums text-neutral-400">
          {option.right}
        </span>
      )}
    </button>
  );
}

const FILTER_OPTION_ROW_SKELETONS = [
  { showIcon: true, labelWidth: "w-32", showRight: false },
  { showIcon: false, labelWidth: "w-24", showRight: true },
  { showIcon: true, labelWidth: "w-20", showRight: false },
  { showIcon: false, labelWidth: "w-28", showRight: false },
  { showIcon: false, labelWidth: "w-16", showRight: true },
] as const;

export function FilterOptionRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div
      className="flex flex-col gap-1"
      aria-busy="true"
      aria-label="Loading options"
    >
      {FILTER_OPTION_ROW_SKELETONS.slice(0, count).map((row, index) => (
        <FilterOptionRowSkeleton key={index} {...row} />
      ))}
    </div>
  );
}

function FilterOptionRowSkeleton({
  showIcon,
  labelWidth,
  showRight,
}: (typeof FILTER_OPTION_ROW_SKELETONS)[number]) {
  return (
    <div
      className="flex w-full items-center gap-3 rounded-md px-2 py-2"
      aria-hidden
    >
      <div className="h-4 w-4 shrink-0 animate-pulse rounded border border-neutral-200 bg-neutral-200" />
      {showIcon && (
        <div className="size-4 shrink-0 animate-pulse rounded bg-neutral-200" />
      )}
      <div className="min-w-0 flex-1">
        <div
          className={cn("h-3 animate-pulse rounded bg-neutral-200", labelWidth)}
        />
      </div>
      {showRight && (
        <div className="h-3 w-6 shrink-0 animate-pulse rounded bg-neutral-200" />
      )}
    </div>
  );
}

function renderFilterIcon(
  icon: NonNullable<
    FilterOption["icon"] | ReturnType<NonNullable<Filter["getOptionIcon"]>>
  >,
) {
  if (isValidElement(icon)) {
    return icon;
  }

  const IconComponent = icon as ComponentType<SVGProps<SVGSVGElement>>;
  return <IconComponent className="size-4" />;
}
