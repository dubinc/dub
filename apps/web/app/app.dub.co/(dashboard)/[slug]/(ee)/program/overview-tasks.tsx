import { usePartnerMessagesCount } from "@/lib/swr/use-partner-messages-count";
import usePartnersCount from "@/lib/swr/use-partners-count";
import usePayoutsCount from "@/lib/swr/use-payouts-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramOverviewCard } from "@/ui/partners/overview/program-overview-card";
import { MoneyBills2, Msgs, UserCheck } from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useMemo } from "react";

export function OverviewTasks() {
  const { slug } = useWorkspace();

  const { partnersCount, loading: partnersCountLoading } = usePartnersCount<
    number | undefined
  >({ status: "pending", ignoreParams: true });

  const {
    payoutsCount: eligiblePayoutsCount,
    loading: eligiblePayoutsLoading,
  } = usePayoutsCount<number | undefined>({
    eligibility: "eligible",
    status: "pending",
  });

  const { count: unreadMessagesCount, isLoading: unreadMessagesLoading } =
    usePartnerMessagesCount({
      query: {
        unread: true,
      },
    });

  const tasks = useMemo(
    () => [
      {
        icon: MoneyBills2,
        label: "Confirm pending payouts",
        count: eligiblePayoutsCount,
        href: `/${slug}/program/payouts?status=pending`,
        loading: eligiblePayoutsLoading,
      },
      {
        icon: Msgs,
        label: "Respond to partners",
        count: unreadMessagesCount,
        href: `/${slug}/program/messages`,
        loading: unreadMessagesLoading,
      },
      {
        icon: UserCheck,
        label: "Review new applications",
        count: partnersCount,
        href: `/${slug}/program/partners/applications`,
        loading: partnersCountLoading,
      },
    ],
    [
      slug,
      eligiblePayoutsCount,
      eligiblePayoutsLoading,
      unreadMessagesCount,
      unreadMessagesLoading,
      partnersCount,
      partnersCountLoading,
    ],
  );

  return (
    <ProgramOverviewCard className="py-4">
      <h2 className="text-content-emphasis px-4 text-sm font-medium">Tasks</h2>
      <div className="mt-4 flex flex-col px-2">
        {tasks.map((task) => (
          <Link
            key={task.label}
            href={task.href}
            className="hover:bg-bg-inverted/5 active:bg-bg-inverted/10 flex items-center justify-between gap-2 rounded-lg p-2 pl-3 text-sm font-semibold transition-colors"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <task.icon className="size-4 shrink-0" />
              <span className="min-w-0 truncate">{task.label}</span>
            </div>

            <div
              className={cn(
                "flex h-8 items-center rounded-lg bg-black/5 px-4 text-neutral-400",
                task.loading && "w-10 animate-pulse",
                task.count && task.count > 0 && "bg-blue-100 text-blue-600",
              )}
            >
              {nFormatter(task.count, { full: true }) ??
                (task.loading ? "" : "-")}
            </div>
          </Link>
        ))}
      </div>
    </ProgramOverviewCard>
  );
}
