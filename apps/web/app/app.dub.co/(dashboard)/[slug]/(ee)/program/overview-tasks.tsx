import usePartnersCount from "@/lib/swr/use-partners-count";
import usePayoutsCount from "@/lib/swr/use-payouts-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramOverviewCard } from "@/ui/partners/program-overview-card";
import { Badge, MoneyBills2, ShieldKeyhole, UserCheck } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useMemo } from "react";

export function OverviewTasks() {
  const { slug } = useWorkspace();

  const { partnersCount, loading: partnersCountLoading } = usePartnersCount<
    number | undefined
  >({ status: "pending", ignoreParams: true });

  const { payoutsCount, loading: payoutsCountLoading } = usePayoutsCount<
    number | undefined
  >({ status: "pending" });

  const tasks = useMemo(
    () => [
      {
        icon: UserCheck,
        label: "Review new applications",
        count: partnersCount,
        href: `/${slug}/program/partners?status=pending`,
        loading: partnersCountLoading,
      },
      {
        icon: MoneyBills2,
        label: "Confirm pending payouts",
        count: payoutsCount,
        href: `/${slug}/program/payouts?status=pending`,
        loading: payoutsCountLoading,
      },
      {
        icon: ShieldKeyhole,
        label: "Fraud & Risk review",
        count: 0,
        href: `/${slug}/program/fraud`,
        comingSoon: true,
      },
    ],
    [
      slug,
      partnersCount,
      partnersCountLoading,
      payoutsCount,
      payoutsCountLoading,
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

            {task.comingSoon ? (
              <div className="flex h-8 items-center">
                <Badge variant="blueGradient" className="py-1">
                  Coming soon
                </Badge>
              </div>
            ) : (
              <div
                className={cn(
                  "flex h-8 items-center rounded-lg bg-black/5 px-4 text-neutral-400",
                  task.loading && "w-10 animate-pulse",
                  task.count && "bg-blue-100 text-blue-600",
                )}
              >
                {task.count ?? (task.loading ? "" : "-")}
              </div>
            )}
          </Link>
        ))}
      </div>
    </ProgramOverviewCard>
  );
}
