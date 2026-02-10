import { ActivityLog } from "@/lib/types";
import { TimestampTooltip } from "@dub/ui";
import { formatDate } from "@dub/utils";
import {
  getActivityLogIcon,
  getActivityLogRenderer,
} from "./activity-log-registry";

interface PartnerGroupActivityItemProps {
  log: ActivityLog;
  isLast?: boolean;
}

export function PartnerGroupActivityItem({
  log,
  isLast = false,
}: PartnerGroupActivityItemProps) {
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

      <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden pb-6">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-neutral-700">
          <Renderer log={log} />
        </div>
        <TimestampTooltip
          timestamp={log.createdAt}
          side="left"
          rows={["local", "utc", "unix"]}
        >
          <time className="text-xs text-neutral-500">
            {formatDate(log.createdAt, {
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
        </TimestampTooltip>
      </div>
    </li>
  );
}
