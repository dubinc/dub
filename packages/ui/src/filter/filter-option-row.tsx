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
};

export function FilterOptionRow({
  filter,
  option,
  checked,
  onToggle,
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
      onClick={onToggle}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 whitespace-nowrap rounded-md px-2 py-2 text-left text-xs font-medium text-neutral-600",
        "transition-colors duration-100 ease-out motion-reduce:transition-none",
        "hover:bg-neutral-100",
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
      <span className="min-w-0 flex-1">{truncate(label, 48)}</span>
      {option.right != null && (
        <span className="shrink-0 text-xs font-medium tabular-nums text-neutral-400">
          {option.right}
        </span>
      )}
    </button>
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
