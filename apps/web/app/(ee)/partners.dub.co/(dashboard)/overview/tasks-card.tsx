"use client";

import { testIds } from "@/lib/e2e/test-ids";
import { useProgramMessagesCount } from "@/lib/messages/hooks/use-program-messages-count";
import useProgramEnrollmentsCount from "@/lib/swr/use-program-enrollments-count";
import { type Icon } from "@dub/ui";
import { Msgs, UserCheck } from "@dub/ui/icons";
import Link from "next/link";
import { OverviewCard } from "./overview-card";

export function TasksCard() {
  const { count: unreadMessagesCount } = useProgramMessagesCount({
    query: { unread: true },
  });

  const { count: invitationsCount } = useProgramEnrollmentsCount({
    status: "invited",
  });

  const tasks = [
    {
      icon: Msgs,
      label: "Respond to programs",
      href: "/messages",
      count: unreadMessagesCount,
    },
    {
      icon: UserCheck,
      label: "Review new invitations",
      href: "/programs/invitations",
      count: invitationsCount,
    },
  ].filter((task): task is typeof task & { count: number } => !!task.count);

  // hide the card when no action is needed (and while the counts load), so
  // that Recent payouts fills the column
  if (tasks.length === 0) {
    return null;
  }

  return (
    <OverviewCard title="Tasks" testId={testIds.partnerOverview.tasks}>
      <div className="flex flex-col px-2 pb-2">
        {tasks.map((task) => (
          <TaskRow key={task.href} {...task} />
        ))}
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
  count: number;
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
      <div className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 px-1.5 text-sm font-semibold text-blue-600">
        {count}
      </div>
    </Link>
  );
}
