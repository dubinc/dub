"use client";

import { useFraudEventsCount } from "@/lib/swr/use-fraud-events-count";
import { FraudEventStatusBadges } from "@/ui/partners/fraud-event-status-badges";
import { useRouterStuff } from "@dub/ui";
import { ShieldKeyhole } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { FraudEventStatus } from "@prisma/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

interface FraudEventCount {
  status: FraudEventStatus;
  count: number;
}

export function FraudEventStats() {
  const { slug } = useParams();
  const { queryParams } = useRouterStuff();

  const { fraudEventsCount, error, loading } = useFraudEventsCount<
    FraudEventCount[]
  >({
    groupBy: "status",
    exclude: ["status"],
  });

  const totalCount = useMemo(() => {
    return fraudEventsCount?.reduce((acc, curr) => acc + curr.count, 0) || 0;
  }, [fraudEventsCount]);

  return (
    <div className="xs:grid-cols-4 xs:divide-x xs:divide-y-0 grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      <StatsFilter
        label="All"
        href={`/${slug}/program/fraud`}
        count={totalCount}
        icon={ShieldKeyhole}
        iconClassName="text-neutral-600 bg-neutral-100"
        error={!!error}
        loading={loading}
      />
      <StatsFilter
        label="Pending"
        href={
          queryParams({
            set: { status: "pending" },
            getNewPath: true,
          }) as string
        }
        count={fraudEventsCount?.find((p) => p.status === "pending")?.count}
        icon={FraudEventStatusBadges.pending.icon}
        iconClassName={FraudEventStatusBadges.pending.className}
        error={!!error}
        loading={loading}
      />
      <StatsFilter
        label="Safe"
        href={
          queryParams({
            set: { status: "safe" },
            getNewPath: true,
          }) as string
        }
        count={fraudEventsCount?.find((p) => p.status === "safe")?.count}
        icon={FraudEventStatusBadges.safe.icon}
        iconClassName={FraudEventStatusBadges.safe.className}
        error={!!error}
        loading={loading}
      />
      <StatsFilter
        label="Banned"
        href={
          queryParams({
            set: { status: "banned" },
            getNewPath: true,
          }) as string
        }
        count={fraudEventsCount?.find((p) => p.status === "banned")?.count}
        icon={FraudEventStatusBadges.banned.icon}
        iconClassName={FraudEventStatusBadges.banned.className}
        error={!!error}
        loading={loading}
      />
    </div>
  );
}

function StatsFilter({
  label,
  href,
  count,
  icon: Icon,
  iconClassName,
  error,
  loading,
}: {
  label: string;
  href: string;
  count?: number;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  error?: boolean;
  loading?: boolean;
}) {
  return (
    <Link href={href}>
      <div className="flex flex-col gap-3 p-3 transition-colors duration-75 hover:bg-neutral-50 active:bg-neutral-100">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-6 items-center justify-center gap-2 rounded-md",
              iconClassName,
            )}
          >
            <Icon className="size-4" />
          </div>
          <div className="text-xs text-neutral-500">{label}</div>
        </div>

        <div className="flex flex-col gap-0.5">
          {loading ? (
            <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
          ) : error ? (
            <span className="text-base font-semibold leading-tight text-neutral-600">
              -
            </span>
          ) : (
            <span className="text-base font-semibold leading-tight text-neutral-600">
              {count?.toLocaleString() || "0"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
