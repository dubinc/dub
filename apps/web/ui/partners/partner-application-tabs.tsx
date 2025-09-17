"use client";

import { usePartnerCommentsCount } from "@/lib/swr/use-partner-comments-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { Msg, User } from "@dub/ui";
import { cn } from "@dub/utils";
import { LayoutGroup, motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Dispatch, SetStateAction, useId, useMemo } from "react";

export function PartnerApplicationTabs({
  currentTabId,
  setCurrentTabId,
}: {
  currentTabId: string;
  setCurrentTabId: Dispatch<SetStateAction<string>>;
}) {
  const { partnerId } = useParams() as { partnerId: string };
  const { slug: workspaceSlug } = useWorkspace();

  const { count: commentsCount } = usePartnerCommentsCount(
    {
      partnerId,
    },
    {
      keepPreviousData: true,
    },
  );

  const tabs = useMemo(
    () => [
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

  const layoutGroupId = useId();

  return (
    <div className="scrollbar-hide relative z-0 flex items-center justify-between gap-1 overflow-x-auto p-2">
      <LayoutGroup id={layoutGroupId}>
        <motion.div
          layout
          className={cn("relative z-0 inline-flex items-center gap-1")}
        >
          {tabs.map(({ id, label, icon: Icon, badge }) => {
            const isSelected = id === currentTabId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCurrentTabId(id)}
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
              </button>
            );
          })}
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
