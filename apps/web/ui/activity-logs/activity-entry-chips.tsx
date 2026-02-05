import { ActivityLog, GroupProps } from "@/lib/types";
import { getResourceColorData, RAINBOW_CONIC_GRADIENT } from "@/ui/colors";
import { Bolt } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { ReactNode } from "react";
import { ActorType, getActorType } from "./activity-log-registry";

interface GroupPillProps extends Pick<GroupProps, "name" | "color"> {}

interface SourcePillProps {
  icon?: ReactNode;
  label: string;
}

interface UserChipProps {
  user: NonNullable<ActivityLog["user"]>;
}

export function GroupPill({ name, color }: GroupPillProps) {
  const colorClassName = color
    ? getResourceColorData(color)?.groupVariants
    : undefined;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0.5 text-sm font-medium text-neutral-700">
      <span
        className={cn("size-2.5 shrink-0 rounded-full", colorClassName)}
        {...(!colorClassName && {
          style: {
            background: RAINBOW_CONIC_GRADIENT,
          },
        })}
      />
      {name}
    </span>
  );
}

export function SourcePill({ icon, label }: SourcePillProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0.5 text-sm font-medium text-neutral-700">
      {icon && (
        <span className="flex size-3.5 items-center justify-center text-neutral-500">
          {icon}
        </span>
      )}
      {label}
    </span>
  );
}

export function UserChip({ user }: UserChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0.5 text-sm font-medium text-neutral-700">
      <img
        src={user.image || `${OG_AVATAR_URL}${user.id}`}
        alt={`${user.name || user.email || "User"}`}
        className="size-4 shrink-0 rounded-full"
      />
      {user.name || user.email || "Unknown user"}
    </span>
  );
}

export function SystemChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0.5 text-sm font-medium text-neutral-700">
      <Bolt className="size-3 text-neutral-500" />
      System
    </span>
  );
}

interface ActorChipProps {
  log: ActivityLog;
}

export function ActorChip({ log }: ActorChipProps) {
  const actorType = getActorType(log);

  if (actorType === "USER" && log.user) {
    return <UserChip user={log.user} />;
  }

  return <SystemChip />;
}

export function getActorPreposition(actorType: ActorType): string {
  return "by";
}
