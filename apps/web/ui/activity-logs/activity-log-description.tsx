import { ActivityLog } from "@/lib/types";
import { OG_AVATAR_URL, timeAgo } from "@dub/utils";
import { useActivityLogContext } from "./activity-log-context";

interface ActivityLogDescriptionProps {
  log: ActivityLog;
}

interface Actor {
  id: string;
  name: string;
  image: string;
}

export function ActivityLogDescription({
  log: { user, description, createdAt },
}: ActivityLogDescriptionProps) {
  const { program } = useActivityLogContext();

  let actor: Actor | null = null;

  if (program) {
    actor = {
      id: program.id,
      name: program.name,
      image: program.logo || `${OG_AVATAR_URL}${program.id}`,
    };
  } else if (user) {
    actor = {
      id: user.id,
      name: user.name || user.email || "Unknown user",
      image: user.image || `${OG_AVATAR_URL}${user.id}`,
    };
  }

  return (
    <div className="mt-2 rounded-xl border border-neutral-200 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs">
        {actor && (
          <>
            <img
              src={actor.image}
              alt={actor.name}
              className="size-4 shrink-0 rounded-full"
            />
            <span className="text-content-default font-semibold">
              {actor.name}
            </span>
            <span className="text-content-muted">·</span>
          </>
        )}

        <span className="text-content-subtle font-normal">
          {timeAgo(createdAt, { withAgo: true })}
        </span>
      </div>

      {description && (
        <p className="text-content-subtle mt-2 text-sm">{description}</p>
      )}
    </div>
  );
}
