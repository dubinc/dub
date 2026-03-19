"use client";

import { useRouterStuff } from "@dub/ui";
import { FilterBars } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import Link from "next/link";
import { type MouseEvent, type ReactNode } from "react";

export function FilterIconCell({
  set,
  icon,
  children,
  onFilterClick,
  isActive: isActiveProp,
}: {
  set: Record<string, any>;
  icon?: ReactNode;
  children?: ReactNode;
  onFilterClick?: (e: MouseEvent) => void;
  isActive?: boolean;
}) {
  const { queryParams, searchParams } = useRouterStuff();
  const isActiveFromUrl = Object.entries(set).every(
    ([k, v]) => searchParams.get(k) === String(v),
  );
  const isActive = isActiveProp !== undefined ? isActiveProp : isActiveFromUrl;
  const persistActiveVisibility = Boolean(onFilterClick && isActive);

  const href = queryParams({ set, del: "page", getNewPath: true }) as string;

  const stopRowPointer = (e: MouseEvent) => e.stopPropagation();

  const filterControlClassName = cn(
    "flex size-6 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
    persistActiveVisibility
      ? "translate-x-0 opacity-100 pointer-events-auto bg-neutral-900"
      : cn(
          "-translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
          "pointer-events-none group-hover:pointer-events-auto",
          isActive ? "bg-neutral-900" : "border border-neutral-200 bg-white",
          "focus-visible:pointer-events-auto focus-visible:translate-x-0 focus-visible:opacity-100",
        ),
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1",
  );

  const filterIcon = (
    <FilterBars
      className={cn("size-3", isActive ? "text-white" : "text-neutral-500")}
    />
  );

  const filterButton = onFilterClick ? (
    <button
      type="button"
      onClick={(e) => {
        stopRowPointer(e);
        onFilterClick(e);
      }}
      onAuxClick={stopRowPointer}
      className={filterControlClassName}
      aria-label="Filter by this value"
    >
      {filterIcon}
    </button>
  ) : (
    <Link
      href={href}
      onClick={stopRowPointer}
      onAuxClick={stopRowPointer}
      className={filterControlClassName}
      aria-label="Filter by this value"
    >
      {filterIcon}
    </Link>
  );

  const showRowFilterLink = !onFilterClick;

  // No-icon + children: filter button is absolutely positioned
  if (!icon && children) {
    return (
      <div className="relative flex items-center">
        {showRowFilterLink && (
          <Link
            href={href}
            onClick={stopRowPointer}
            onAuxClick={stopRowPointer}
            className="absolute inset-0 z-0"
            aria-label="Filter by this value"
          />
        )}

        <div className="absolute inset-y-0 left-0 z-10 flex items-center">
          {filterButton}
        </div>

        <div
          className={cn(
            "relative z-10 min-w-0 transition-all duration-200",
            persistActiveVisibility
              ? "translate-x-8"
              : "group-hover:translate-x-8",
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", children && "relative")}>
      {children && showRowFilterLink && (
        <Link
          href={href}
          onClick={stopRowPointer}
          onAuxClick={stopRowPointer}
          className="absolute inset-0 z-0"
          aria-label="Filter by this value"
        />
      )}

      <div
        className={cn(
          "relative shrink-0 transition-all duration-200",
          icon ? "size-6" : "h-6 w-0 group-hover:w-6",
        )}
        style={{ zIndex: children ? 10 : undefined }}
      >
        {icon && (
          <div
            className={cn(
              "flex size-full items-center justify-center transition-all duration-200",
              persistActiveVisibility
                ? "translate-x-3 opacity-0"
                : "group-hover:translate-x-3 group-hover:opacity-0",
            )}
          >
            {icon}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          {filterButton}
        </div>
      </div>

      {children && (
        <div className="relative min-w-0" style={{ zIndex: 10 }}>
          {children}
        </div>
      )}
    </div>
  );
}
