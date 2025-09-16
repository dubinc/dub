"use client";

import { usePartnerCommentsCount } from "@/lib/swr/use-partner-comments-count";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  ArrowUpRight2,
  Hyperlink,
  InvoiceDollar,
  MoneyBills2,
  Msg,
  User,
  useScrollProgress,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef } from "react";

export function PartnerNav() {
  const pathname = usePathname();
  const { partnerId } = useParams() as { partnerId: string };
  const { slug: workspaceSlug } = useWorkspace();

  const { count: commentsCount } = usePartnerCommentsCount({
    partnerId,
  });

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

  const tabs = useMemo(
    () => [
      {
        id: "links",
        label: "Links",
        icon: Hyperlink,
      },
      {
        id: "payouts",
        label: "Payouts",
        icon: MoneyBills2,
      },
      {
        id: "about",
        label: "About",
        icon: User,
      },
      {
        id: "comments",
        label: "Comments",
        badge: commentsCount
          ? commentsCount > 99
            ? "99+"
            : commentsCount
          : undefined,
        icon: Msg,
      },
    ],
    [commentsCount],
  );

  return (
    <div className="relative z-0">
      <div
        ref={containerRef}
        onScroll={updateScrollProgress}
        className="scrollbar-hide relative z-0 flex items-center justify-between gap-1 overflow-x-auto p-2"
      >
        <LayoutGroup id={layoutGroupId}>
          <motion.div
            layout
            className={cn("relative z-0 inline-flex items-center gap-1")}
          >
            {tabs.map(({ id, label, icon: Icon, badge }) => {
              const isSelected = pathname.endsWith(`/${id}`);
              return (
                <Link
                  key={id}
                  href={`/${workspaceSlug}/program/partners/${partnerId}/${id}`}
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
        <Link
          href={`/${workspaceSlug}/program/partners/commissions?partnerId=${partnerId}`}
          target="_blank"
          className={cn(
            "text-content-emphasis relative z-10 flex items-center px-2.5 py-1 text-sm font-medium",
            "hover:text-content-subtle z-[11] transition-colors",
          )}
        >
          <InvoiceDollar className="mr-2 size-4" />
          <span>Commissions</span>
          <ArrowUpRight2 className="text-content-subtle ml-1 size-3.5" />
        </Link>
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 -right-px w-16 bg-gradient-to-l from-neutral-100"
        style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
      />
    </div>
  );
}
