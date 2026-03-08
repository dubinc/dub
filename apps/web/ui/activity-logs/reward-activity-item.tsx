import { ActivityLog } from "@/lib/types";
import {
  getActivityLogIcon,
  getActivityLogRenderer,
} from "./activity-log-registry";

interface RewardActivityItemProps {
  log: ActivityLog;
  isLast?: boolean;
}

export function RewardActivityItem({
  log,
  isLast = false,
}: RewardActivityItemProps) {
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

      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden pb-4">
        <Renderer log={log} />
      </div>
    </li>
  );
}
