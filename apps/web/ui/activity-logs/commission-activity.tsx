"use client";

import { useActivityLogs } from "@/lib/swr/use-activity-logs";
import {
  ActivityLog,
  CommissionActivitySnapshot,
  CommissionDetail,
} from "@/lib/types";
import { ActivityEvent } from "@/ui/partners/activity-event";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { CommentCardDisplay } from "@/ui/partners/partner-comments";
import { UserAvatar } from "@/ui/users/user-avatar";
import { InvoiceDollar, Receipt2, StatusBadge } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import Link from "next/link";

type CommissionChangeSet = Record<
  string,
  {
    old: CommissionActivitySnapshot | null;
    new: CommissionActivitySnapshot;
  }
>;

function parseChangeSet(log: ActivityLog) {
  const changeSet = log.changeSet as CommissionChangeSet | null;
  const old = changeSet?.commission?.old ?? null;
  const cur = changeSet?.commission?.new ?? null;

  if (!cur) return null;

  const {
    amount: curSaleAmount,
    earnings: curEarnings,
    status: curStatus,
  } = cur;
  const oldSaleAmount = old?.amount;
  const oldEarnings = old?.earnings;

  const statusChanged =
    old?.status !== curStatus &&
    typeof curStatus === "string" &&
    curStatus in CommissionStatusBadges;

  const saleAmountChanged = oldSaleAmount !== curSaleAmount;
  const earningsChanged = oldEarnings !== curEarnings;

  return {
    old,
    cur,
    statusChanged,
    saleAmountChanged,
    earningsChanged,
    curSaleAmount,
    curEarnings,
    oldSaleAmount,
    oldEarnings,
    newStatus: statusChanged
      ? (curStatus as keyof typeof CommissionStatusBadges)
      : null,
  };
}

export function CommissionActivity({
  commission,
  slug,
}: {
  commission: CommissionDetail;
  slug: string;
}) {
  const { activityLogs, loading } = useActivityLogs({
    enabled: !!commission.id,
    query: {
      resourceType: "commission",
      resourceId: commission.id,
    },
  });

  if (loading) {
    return (
      <div className="mt-6">
        <h3 className="mb-4 text-base font-medium text-neutral-900">
          Activity
        </h3>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="size-6 shrink-0 animate-pulse rounded-full bg-neutral-200" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const createdEvent =
    commission.status !== "pending" && activityLogs?.length === 0
      ? {
          key: "created",
          icon: CommissionStatusBadges[commission.status].icon,
          timestamp: commission.createdAt,
          children: (
            <>
              <span className="text-sm text-neutral-700">
                Commission imported as
              </span>
              <StatusBadge
                icon={null}
                variant={CommissionStatusBadges[commission.status].variant}
              >
                {CommissionStatusBadges[commission.status].label}
              </StatusBadge>
            </>
          ),
        }
      : {
          key: "created",
          icon: CommissionStatusBadges["pending"].icon,
          timestamp: commission.createdAt,
          note: (() => {
            const text = commission.reward
              ? `Earn ${
                  commission.reward.type === "percentage"
                    ? `${commission.reward.amountInPercentage ?? 0}%`
                    : currencyFormatter(commission.reward.amountInCents ?? 0, {
                        trailingZeroDisplay: "stripIfInteger",
                      })
                } per ${commission.reward.event}`
              : commission.description ?? null;

            if (!text) return undefined;

            return (
              <CommentCardDisplay
                timestamp={commission.createdAt}
                text={text}
              />
            );
          })(),

          children: (
            <>
              <span className="text-sm text-neutral-700">Commission</span>
              <StatusBadge
                icon={null}
                variant={CommissionStatusBadges["pending"].variant}
              >
                {CommissionStatusBadges["pending"].label}
              </StatusBadge>
            </>
          ),
        };

  const fmt = (v: number) =>
    currencyFormatter(v, { trailingZeroDisplay: "stripIfInteger" });

  const logEvents = (activityLogs ?? []).flatMap((log) => {
    const parsed = parseChangeSet(log);
    if (!parsed) return [];

    const {
      statusChanged,
      saleAmountChanged,
      earningsChanged,
      newStatus,
      curSaleAmount,
      curEarnings,
      oldSaleAmount,
      oldEarnings,
    } = parsed;

    const financialsChanged = saleAmountChanged || earningsChanged;

    if (!statusChanged && !financialsChanged) {
      return [];
    }

    const note = log.description ? (
      <CommentCardDisplay timestamp={log.createdAt} text={log.description} />
    ) : undefined;

    const userByline = log.user ? (
      <>
        <span className="text-sm text-neutral-500">by</span>
        <div className="flex h-6 items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1">
          <UserAvatar user={log.user} className="size-4" />
          <span className="text-[13px] text-neutral-700">{log.user.name}</span>
        </div>
      </>
    ) : null;

    const events: {
      key: string;
      icon: React.ElementType;
      timestamp: string | Date;
      note?: typeof note;
      children: React.ReactNode;
    }[] = [];

    if (statusChanged && newStatus) {
      const badge = CommissionStatusBadges[newStatus];

      events.push({
        key: `${log.id}-status`,
        icon: badge.icon,
        timestamp: log.createdAt,
        note,
        children: (
          <>
            <span className="text-sm text-neutral-700">Status updated to</span>
            <StatusBadge icon={null} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
            {newStatus === "processed" && commission.holdingPeriodDays ? (
              <span className="text-sm text-neutral-700">
                after {commission.holdingPeriodDays}-day{" "}
                <a
                  href="https://dub.co/help/article/partner-payouts#payout-holding-period"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-help underline decoration-dotted underline-offset-2"
                >
                  holding period
                </a>
              </span>
            ) : null}
            {userByline}
            {newStatus === "paid" && commission.payout?.id ? (
              <Link
                href={`/${slug}/program/payouts/${commission.payout.id}`}
                className="flex h-6 cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1 transition-colors hover:bg-neutral-200"
              >
                <InvoiceDollar className="size-4 shrink-0 text-neutral-500" />
                <span className="font-mono text-[13px] text-neutral-700">
                  {commission.payout.id}
                </span>
              </Link>
            ) : null}
          </>
        ),
      });
    }

    if (saleAmountChanged) {
      events.push({
        key: `${log.id}-sale`,
        icon: Receipt2,
        timestamp: log.createdAt,
        note: !statusChanged ? note : undefined,
        children: (
          <>
            <span className="text-sm text-neutral-700">
              Sale amount updated
            </span>
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-[13px] text-neutral-700">
              {fmt(oldSaleAmount ?? 0)} → {fmt(curSaleAmount)}
            </span>
            {userByline}
          </>
        ),
      });
    }

    if (earningsChanged) {
      events.push({
        key: `${log.id}-earnings`,
        icon: InvoiceDollar,
        timestamp: log.createdAt,
        note: !statusChanged && !saleAmountChanged ? note : undefined,
        children: (
          <>
            <span className="text-sm text-neutral-700">Earnings updated</span>
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-[13px] text-neutral-700">
              {fmt(oldEarnings ?? 0)} → {fmt(curEarnings)}
            </span>
            {userByline}
          </>
        ),
      });
    }

    return events;
  });

  const allEvents = [...logEvents, createdEvent];

  return (
    <div className="mt-6">
      <h3 className="mb-4 text-base font-medium text-neutral-900">Activity</h3>
      <div className="flex flex-col">
        {allEvents.map((event, index) => (
          <ActivityEvent
            key={event.key}
            icon={event.icon}
            timestamp={event.timestamp}
            note={event.note}
            isLast={index === allEvents.length - 1}
          >
            {event.children}
          </ActivityEvent>
        ))}
      </div>
    </div>
  );
}
