"use client";

import { useRouterStuff } from "@dub/ui";
import { FilterBars } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import Link from "next/link";
import { ReactNode } from "react";

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

  return (
    <div className={cn("flex items-center gap-3", children && "relative")}>
      {children && (
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-0"
          aria-label="Filter by this value"
        />
      )}

      <div
        className="relative size-6 shrink-0"
        style={{ zIndex: children ? 10 : undefined }}
      >
        {icon && (
          <div className="flex size-full items-center justify-center transition-all duration-200 group-hover:translate-x-3 group-hover:opacity-0">
            {icon}
          </div>
        )}
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-lg transition-all duration-200",
            "-translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
            isActive ? "bg-neutral-900" : "border border-neutral-200 bg-white",
          )}
          aria-label="Filter by this value"
        >
          <FilterBars
            className={cn(
              "size-3",
              isActive ? "text-white" : "text-neutral-500",
            )}
          />
        </Link>
      </div>

      {children && (
        <div className="relative min-w-0" style={{ zIndex: 10 }}>
          {children}
        </div>
      )}
    </div>
  );
}
