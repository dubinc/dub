import { ActivityLog } from "@/lib/types";
import { formatDate } from "@dub/utils";
import { ActivityLogDescription } from "./activity-log-description";
import {
  getActivityLogIcon,
  getActivityLogRenderer,
} from "./activity-log-registry";

export function RewardActivityItem({
  log,
  isLast = false,
}: {
  log: ActivityLog;
  isLast?: boolean;
}) {
  const icon = getActivityLogIcon(log);
  const Renderer = getActivityLogRenderer(log.action);

  if (!Renderer) {
    return null;
  }

  return (
    <li className="relative flex min-w-0 gap-3">
      {!isLast && (
        <div
          className="absolute left-[11px] top-6 h-[calc(100%-8px)] w-px bg-neutral-200"
          aria-hidden="true"
        />
      )}

      <div
        className="flex size-6 shrink-0 items-center justify-center text-neutral-500"
        aria-hidden="true"
      >
        {icon}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden pb-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-neutral-700">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 overflow-hidden">
              <Renderer log={log} />
            </div>
            <time className="hidden shrink-0 text-xs text-neutral-500 sm:block">
              {formatDate(log.createdAt, {
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
          </div>
        </div>
        {log.description && <ActivityLogDescription log={log} />}
      </div>
    </li>
  );
}
