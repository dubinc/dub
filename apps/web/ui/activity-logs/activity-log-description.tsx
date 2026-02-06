import { ActivityLog } from "@/lib/types";
import { OG_AVATAR_URL, timeAgo } from "@dub/utils";

interface ActivityLogDescriptionProps {
  log: ActivityLog;
}
export function ActivityLogDescription({ log }: ActivityLogDescriptionProps) {
  const { user, description, createdAt } = log;
  return (
    <div className="mt-2 rounded-xl border border-neutral-200 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs">
        {user && (
          <>
            <img
              src={user.image || `${OG_AVATAR_URL}${user.id}`}
              alt={user.name || ""}
              className="size-4 shrink-0 rounded-full"
            />
            <span className="text-content-default font-semibold">
              {user.name || user.email || "Unknown user"}
            </span>
            <span className="text-content-muted">·</span>
          </>
        )}
        <span className="text-content-subtle font-normal">
          {timeAgo(createdAt, { withAgo: true })}
        </span>
      </div>
      <p className="text-content-subtle mt-2 text-sm">{description}</p>
    </div>
  );
}
