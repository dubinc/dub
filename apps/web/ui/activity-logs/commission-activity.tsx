"use client";

import {
  getCommissionCreatedActivity,
  getCommissionSourceDisplay,
} from "@/lib/commissions/display-commission-source";
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

function ActivityPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex h-6 items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1">
      {icon}
      <span className="text-[13px] text-neutral-700">{label}</span>
    </div>
  );
}

function ActivityUserPill({
  user,
}: {
  user: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}) {
  return (
    <ActivityPill
      icon={<UserAvatar user={user} className="size-4" />}
      label={user.name || user.email || "Deleted user"}
    />
  );
}

function ActivitySourcePill({
  image,
  label,
}: {
  image: string;
  label: string;
}) {
  return (
    <ActivityPill
      icon={
        <img
          src={image}
          alt=""
          className="size-4 shrink-0 rounded-full border border-neutral-200"
        />
      }
      label={label}
    />
  );
}

function getCommissionNote({
  description,
  reward,
  createdAt,
}: Pick<CommissionDetail, "description" | "reward" | "createdAt">) {
  let text = description;

  if (!text && reward) {
    const amount =
      reward.type === "percentage"
        ? `${reward.amountInPercentage ?? 0}%`
        : currencyFormatter(reward.amountInCents ?? 0, {
            trailingZeroDisplay: "stripIfInteger",
          });

    text = `Earn ${amount} per ${reward.event}`;
  }

  if (!text) {
    return undefined;
  }

  return <CommentCardDisplay timestamp={createdAt} text={text} />;
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

  const sourceDisplay = getCommissionSourceDisplay(commission.source);
  const created = getCommissionCreatedActivity({
    source: commission.source,
    status: commission.status,
    hasActivityLogs: (activityLogs?.length ?? 0) > 0,
    hasUser: !!commission.user,
  });
  const createdBadge = CommissionStatusBadges[created.status];

  const createdEvent = {
    key: "created",
    icon: createdBadge.icon,
    timestamp: commission.createdAt,
    note: getCommissionNote(commission),
    children: (
      <>
        <span className="text-sm text-neutral-700">{created.lead}</span>
        {created.showUser && commission.user ? (
          <ActivityUserPill user={commission.user} />
        ) : sourceDisplay ? (
          <ActivitySourcePill
            image={
              sourceDisplay.image ?? "https://assets.dub.co/logo-square.png"
            }
            label={sourceDisplay.name}
          />
        ) : null}
        {created.lead === "Commission imported as" ? null : (
          <span className="text-sm text-neutral-700">as</span>
        )}
        <StatusBadge icon={null} variant={createdBadge.variant}>
          {createdBadge.label}
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
        <ActivityUserPill user={log.user} />
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
