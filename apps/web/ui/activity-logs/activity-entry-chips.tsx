import { ActivityLog, GroupProps, ProgramProps } from "@/lib/types";
import { getResourceColorData, RAINBOW_CONIC_GRADIENT } from "@/ui/colors";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { ReferralStatusBadges } from "@/ui/referrals/referral-status-badges";
import { ProgramEnrollmentStatus, ReferralStatus } from "@dub/prisma/client";
import { Bolt, Tooltip } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { ReactNode } from "react";
import { UserAvatar } from "../users/user-avatar";
import { useActivityLogContext } from "./activity-log-context";
import { getActorType } from "./activity-log-registry";

interface ActivityChipProps {
  children: ReactNode;
  className?: string;
}

interface GroupPillProps extends Pick<GroupProps, "name" | "color"> {}

interface SourcePillProps {
  icon?: ReactNode;
  label: string;
}

interface UserChipProps {
  user: NonNullable<ActivityLog["user"]>;
}

interface ProgramChipProps {
  program: Pick<ProgramProps, "id" | "name" | "logo">;
}

interface ActorChipProps {
  log: ActivityLog;
}

function ActivityChip({ children, className }: ActivityChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1 text-sm font-medium text-neutral-700",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function GroupPill({ name, color }: GroupPillProps) {
  const colorClassName = color
    ? getResourceColorData(color)?.groupVariants
    : undefined;

  return (
    <ActivityChip>
      <span
        className={cn("size-2.5 shrink-0 rounded-full", colorClassName)}
        {...(!colorClassName && {
          style: {
            background: RAINBOW_CONIC_GRADIENT,
          },
        })}
      />
      {name}
    </ActivityChip>
  );
}

export function SourcePill({ icon, label }: SourcePillProps) {
  return (
    <ActivityChip>
      {icon}
      {label}
    </ActivityChip>
  );
}

export function UserChip({ user }: UserChipProps) {
  return (
    <ActivityChip>
      <UserAvatar user={user} className="size-4 shrink-0" />
      {user.name || user.email || "Deleted user"}
    </ActivityChip>
  );
}

export function ProgramChip({ program }: ProgramChipProps) {
  return (
    <ActivityChip>
      <img
        src={program.logo || `${OG_AVATAR_URL}${program.id}`}
        alt={program.name}
        className="size-4 shrink-0 rounded-full"
      />
      {program.name}
    </ActivityChip>
  );
}

export function SystemChip() {
  return (
    <ActivityChip>
      <Bolt className="size-3 text-neutral-500" />
      System
    </ActivityChip>
  );
}

export function ActorChip({ log }: ActorChipProps) {
  const { program } = useActivityLogContext();

  if (program) {
    return <ProgramChip program={program} />;
  }

  const actorType = getActorType(log);

  if (actorType === "USER" && log.user) {
    return <UserChip user={log.user} />;
  }

  return <SystemChip />;
}

export function PartnerStatusPill({
  status,
}: {
  status: ProgramEnrollmentStatus;
}) {
  const badge = PartnerStatusBadges[status];

  if (!badge) return null;

  return <ActivityChip className={badge.className}>{badge.label}</ActivityChip>;
}

export function ReferralStatusPill({ status }: { status: ReferralStatus }) {
  const badge = ReferralStatusBadges[status];

  if (!badge) return null;

  return <ActivityChip className={badge.className}>{badge.label}</ActivityChip>;
}

export function ActivityLogUserAvatar({ user }: { user: ActivityLog["user"] }) {
  if (!user) return null;

  return (
    <Tooltip
      content={
        <div className="flex flex-col gap-1 p-2.5">
          <UserAvatar user={user} className="size-6 shrink-0" />
          <p className="text-sm font-medium text-neutral-900">
            {user.name || user.email || "User"}
          </p>
          {user.email && user.name && (
            <p className="text-xs text-neutral-500">{user.email}</p>
          )}
        </div>
      }
    >
      <div>
        <UserAvatar
          user={user}
          className="size-4 shrink-0 transition-transform duration-100 hover:scale-110 hover:cursor-pointer"
        />
      </div>
    </Tooltip>
  );
}
