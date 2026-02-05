import { ActivityLog, GroupProps } from "@/lib/types";
import { getResourceColorData, RAINBOW_CONIC_GRADIENT } from "@/ui/colors";
import { ReferralStatusBadges } from "@/ui/referrals/referral-status-badges";
import { ReferralStatus } from "@dub/prisma/client";
import { Bolt } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { ReactNode } from "react";
import { getActorType } from "./activity-log-registry";

interface GroupPillProps extends Pick<GroupProps, "name" | "color"> {}

interface SourcePillProps {
  icon?: ReactNode;
  label: string;
}

interface UserChipProps {
  user: NonNullable<ActivityLog["user"]>;
}

interface ActorChipProps {
  log: ActivityLog;
}

export function GroupPill({ name, color }: GroupPillProps) {
  const colorClassName = color
    ? getResourceColorData(color)?.groupVariants
    : undefined;

  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2 py-0.5 text-sm font-medium text-neutral-700">
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
    <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2 py-0.5 text-sm font-medium text-neutral-700">
      {icon && <span className="size-2.5 shrink-0 rounded-full">{icon}</span>}
      {label}
    </span>
  );
}

export function UserChip({ user }: UserChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2 py-0.5 text-sm font-medium text-neutral-700">
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
    <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2 py-0.5 text-sm font-medium text-neutral-700">
      <Bolt className="size-3 text-neutral-500" />
      System
    </span>
  );
}

export function ActorChip({ log }: ActorChipProps) {
  const actorType = getActorType(log);

  if (actorType === "USER" && log.user) {
    return <UserChip user={log.user} />;
  }

  return <SystemChip />;
}

export function ReferralStatusPill({ status }: { status: ReferralStatus }) {
  const badge = ReferralStatusBadges[status];

  if (!badge) return null;

  return (
    <span
      className={cn(
        "inline-flex rounded-lg px-2 py-0.5 text-sm font-medium",
        badge.className,
      )}
    >
      {badge.label}
    </span>
  );
}
