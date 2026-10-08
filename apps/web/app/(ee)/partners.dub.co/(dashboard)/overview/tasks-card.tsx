"use client";

import { useProgramMessagesCount } from "@/lib/messages/hooks/use-program-messages-count";
import useProgramEnrollmentsCount from "@/lib/swr/use-program-enrollments-count";
import { type Icon } from "@dub/ui";
import { Msgs, UserCheck } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import Link from "next/link";
import { OverviewCard } from "./overview-card";

export function TasksCard() {
  const { count: unreadMessagesCount } = useProgramMessagesCount({
    query: { unread: true },
  });

  const { count: invitationsCount } = useProgramEnrollmentsCount({
    status: "invited",
  });

  return (
    <OverviewCard title="Tasks">
      <div className="flex flex-col px-2 pb-2">
        <TaskRow
          icon={Msgs}
          label="Respond to programs"
          href="/messages"
          count={unreadMessagesCount}
        />
        <TaskRow
          icon={UserCheck}
          label="Review new invitations"
          href="/programs/invitations"
          count={invitationsCount}
        />
      </div>
    </OverviewCard>
  );
}

function TaskRow({
  icon: TaskIcon,
  label,
  href,
  count,
}: {
  icon: Icon;
  label: string;
  href: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg p-2 transition-colors duration-100 hover:bg-neutral-50 active:bg-neutral-100"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200">
        <TaskIcon className="size-[18px] text-neutral-800" />
      </div>
      <span className="text-content-emphasis min-w-0 grow truncate text-sm font-semibold">
        {label}
      </span>
      {count === undefined ? (
        <div className="size-8 shrink-0 animate-pulse rounded-lg bg-neutral-200" />
      ) : (
        <div
          className={cn(
            "flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-1.5 text-sm font-semibold",
            count > 0
              ? "bg-blue-50 text-blue-600"
              : "bg-neutral-100 text-neutral-400",
          )}
        >
          {count}
        </div>
      )}
    </Link>
  );
}
