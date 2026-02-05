import { ActivityLog } from "@/lib/types";
import { formatDate } from "@dub/utils";
import {
  getActivityLogIcon,
  getActivityLogRenderer,
} from "./activity-log-registry";

interface ActivityItemProps {
  log: ActivityLog;
  isLast?: boolean;
}

interface ActivityFeedProps {
  logs: ActivityLog[];
}

export function ActivityItem({ log, isLast = false }: ActivityItemProps) {
  const icon = getActivityLogIcon(log);
  const Renderer = getActivityLogRenderer(log.action);

  if (!Renderer) {
    return null;
  }

  return (
    <li className="relative flex gap-3">
      {!isLast && (
        <div
          className="absolute left-[11px] top-6 h-[calc(100%-8px)] w-px bg-neutral-200"
          aria-hidden="true"
        />
      )}

      <div
        className="relative flex size-6 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        <div className="flex size-6 items-center justify-center text-neutral-500">
          {icon}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 pb-6">
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-700">
          <Renderer log={log} />
        </div>

        <time className="text-xs text-neutral-500">
          {formatDate(log.createdAt, {
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
      </div>
    </li>
  );
}

export function ActivityFeed({ logs }: ActivityFeedProps) {
  if (!logs || logs.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col" role="list">
      {logs.map((log, index) => (
        <ActivityItem
          key={log.id}
          log={log}
          isLast={index === logs.length - 1}
        />
      ))}
    </ul>
  );
}

export function ActivityFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="flex flex-col" role="list">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="relative flex gap-3">
          {i < count - 1 && (
            <div
              className="absolute left-[11px] top-6 h-[calc(100%-8px)] w-px bg-neutral-200"
              aria-hidden="true"
            />
          )}
          <div className="flex size-6 shrink-0 items-center justify-center">
            <div className="size-5 animate-pulse rounded-full bg-neutral-200" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 pb-6">
            <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
          </div>
        </li>
      ))}
    </ul>
  );
}
