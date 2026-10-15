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
        // UserCheck is drawn on a 14px grid, so its strokes render thicker than the 18px icons
        iconClassName: "[&_path]:[stroke-width:1.17]",
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
    <ProgramOverviewCard className="rounded-xl">
      <div className="flex h-12 items-center pl-4 pr-3">
        <h2 className="text-content-emphasis text-sm font-semibold">Tasks</h2>
      </div>
      <div className="flex flex-col px-2 pb-2">
        {tasks.map((task) => (
          <Link
            key={task.label}
            href={task.href}
            className="hover:bg-bg-inverted/5 active:bg-bg-inverted/10 flex items-center justify-between gap-2.5 rounded-lg p-2 text-sm font-medium transition-colors"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200">
                <task.icon
                  className={cn("size-[18px] shrink-0", task.iconClassName)}
                />
              </div>
              <span className="min-w-0 truncate">{task.label}</span>
            </div>

            <div
              className={cn(
                "flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 px-1.5 text-sm font-semibold text-blue-600",
                !(task.count && task.count > 0) &&
                  "bg-neutral-100 text-neutral-400",
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
