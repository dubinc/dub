import { usePartnerMessagesCount } from "@/lib/messages/hooks/use-partner-messages-count";
import { useProgramApplicationsCount } from "@/lib/program-applications/hooks/use-program-applications-count";
import { usePayoutsCount } from "@/lib/swr/use-payouts-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramOverviewCard } from "@/ui/partners/overview/program-overview-card";
import { MoneyBills2, Msgs, UserCheck } from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useMemo } from "react";

export function OverviewTasks() {
  const { slug } = useWorkspace();

  const { applicationsCount, loading: applicationsCountLoading } =
    useProgramApplicationsCount<number | undefined>({
      status: "pending",
      ignoreParams: true,
    });

  const {
    payoutsCount: eligiblePayoutsCount,
    loading: eligiblePayoutsLoading,
  } = usePayoutsCount({
    eligibility: "eligible",
    status: "pending",
    ignoreParams: true,
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
        count: eligiblePayoutsCount?.[0]?.count ?? 0,
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
        count: applicationsCount,
        href: `/${slug}/program/partners/applications`,
        loading: applicationsCountLoading,
      },
    ],
    [
      slug,
      eligiblePayoutsCount,
      eligiblePayoutsLoading,
      unreadMessagesCount,
      unreadMessagesLoading,
      applicationsCount,
      applicationsCountLoading,
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
                "flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 px-1.5 text-sm font-semibold text-blue-600",
                !(task.count && task.count > 0) &&
                  "bg-neutral-100 text-neutral-500",
                task.loading && "w-10 animate-pulse",
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
