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
}: {
  set: Record<string, any>;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const { queryParams, searchParams } = useRouterStuff();
  const isActive = Object.entries(set).every(
    ([k, v]) => searchParams.get(k) === String(v),
  );

  const href = queryParams({ set, del: "page", getNewPath: true }) as string;

  const stopRowPointer = (e: MouseEvent) => e.stopPropagation();

  const filterButtonLink = (
    <Link
      href={href}
      onClick={stopRowPointer}
      onAuxClick={stopRowPointer}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
        "-translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
        "pointer-events-none group-hover:pointer-events-auto",
        "focus:pointer-events-auto focus:translate-x-0 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1",
        isActive ? "bg-neutral-900" : "border border-neutral-200 bg-white",
      )}
      aria-label="Filter by this value"
    >
      <FilterBars
        className={cn("size-3", isActive ? "text-white" : "text-neutral-500")}
      />
    </Link>
  );

  // No-icon + children: filter button is absolutely positioned
  if (!icon && children) {
    return (
      <div className="relative flex items-center">
        <Link
          href={href}
          onClick={stopRowPointer}
          onAuxClick={stopRowPointer}
          className="absolute inset-0 z-0"
          aria-label="Filter by this value"
        />

        <div className="absolute inset-y-0 left-0 z-10 flex items-center">
          {filterButtonLink}
        </div>

        <div className="relative z-10 min-w-0 transition-all duration-200 group-hover:translate-x-8">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", children && "relative")}>
      {children && (
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
          <div className="flex size-full items-center justify-center transition-all duration-200 group-hover:translate-x-3 group-hover:opacity-0">
            {icon}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          {filterButtonLink}
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
