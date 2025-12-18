"use client";

import { ArrowUpRight2, Icon, useScrollProgress } from "@dub/ui";
import { cn } from "@dub/utils";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef } from "react";

export type PageNavTabsTab = {
  id: string;
  label: string;
  icon: Icon;
  badge?: string | number;
};

export type PageNavTabsQuicklink = {
  id: string;
  label: string;
  icon: Icon;
  href: string;
};

export type PageNavTabsProps = {
  basePath: string;
  tabs: PageNavTabsTab[];
  quickLinks?: PageNavTabsQuicklink[];
};

export function PageNavTabs({ basePath, tabs, quickLinks }: PageNavTabsProps) {
  const pathname = usePathname();

  const containerRef = useRef<HTMLDivElement>(null);
  const layoutGroupId = useId();

  useEffect(() => {
    if (!containerRef.current) return;

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();

      containerRef.current?.scrollBy({
        left: event.deltaY,
        behavior: "smooth",
      });
    };

    containerRef.current.addEventListener("wheel", handleWheel);

    return () =>
      containerRef.current?.removeEventListener("wheel", handleWheel);
  }, []);

  const { scrollProgress, updateScrollProgress } = useScrollProgress(
    containerRef,
    { direction: "horizontal" },
  );

  return (
    <div className="relative z-0">
      <div
        ref={containerRef}
        onScroll={updateScrollProgress}
        className="scrollbar-hide relative z-0 flex items-center justify-between gap-1 overflow-x-auto p-2"
      >
        <LayoutGroup id={`${layoutGroupId}-tabs`}>
          <motion.div
            layout
            className={cn("relative z-0 inline-flex items-center gap-1")}
          >
            {tabs.map(({ id, label, icon: Icon, badge }) => {
              const isSelected = pathname.endsWith(`/${id}`);
              return (
                <Link
                  key={id}
                  href={`${basePath}/${id}`}
                  data-selected={isSelected}
                  className={cn(
                    "text-content-emphasis relative z-10 flex items-center gap-2 px-2.5 py-1 text-sm font-medium",
                    !isSelected &&
                      "hover:text-content-subtle z-[11] transition-colors",
                    badge && "pr-1",
                  )}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                  {badge && (
                    <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {badge}
                    </span>
                  )}
                  {isSelected && (
                    <motion.div
                      layoutId={layoutGroupId}
                      className={cn(
                        "border-border-subtle bg-bg-default absolute left-0 top-0 -z-[1] size-full rounded-lg border shadow-sm",
                      )}
                      transition={{ duration: 0.25 }}
                    />
                  )}
                </Link>
              );
            })}
          </motion.div>
        </LayoutGroup>

        {Boolean(quickLinks?.length) && (
          <LayoutGroup id={`${layoutGroupId}-quicklinks`}>
            <motion.div
              layout
              className="relative z-10 flex items-center gap-1"
            >
              {quickLinks!.map(({ id, label, icon: Icon, href }) => {
                return (
                  <Link
                    key={id}
                    href={href}
                    target="_blank"
                    className={cn(
                      "text-content-emphasis relative z-10 flex items-center gap-2 px-2.5 py-1 text-sm font-medium",
                      "hover:text-content-subtle z-[11] transition-colors",
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{label}</span>
                    <ArrowUpRight2 className="text-content-subtle size-3.5" />
                  </Link>
                );
              })}
            </motion.div>
          </LayoutGroup>
        )}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 -right-px w-16 bg-gradient-to-l from-neutral-100"
        style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
      />
    </div>
  );
}
