import { PartnerBountyProps } from "@/lib/types";
import { StatusBadge } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { differenceInDays } from "date-fns";

const NEW_BOUNTY_DAYS = 14;
const EXPIRING_SOON_DAYS = 2;

interface BountyBadgeStateResult {
  status: "expired" | "expiring_soon" | "completed" | "new";
  endsAtFormatted: string | null;
  completedAtFormatted: string | null;
}

function getBountyBadgeState(
  bounty: PartnerBountyProps,
): BountyBadgeStateResult | null {
  const now = new Date();
  const endsAt = bounty.endsAt ? new Date(bounty.endsAt) : null;
  const startsAt = new Date(bounty.startsAt);

  const endsAtFormatted = bounty.endsAt
    ? formatDate(bounty.endsAt, { month: "short" })
    : null;

  const isExpired = endsAt !== null && endsAt < now;

  if (isExpired) {
    return {
      status: "expired",
      endsAtFormatted,
      completedAtFormatted: null,
    };
  }

  const daysUntilEnd = endsAt ? differenceInDays(endsAt, now) : null;
  const isExpiringSoon =
    endsAt !== null &&
    daysUntilEnd !== null &&
    daysUntilEnd >= 0 &&
    daysUntilEnd <= EXPIRING_SOON_DAYS;

  if (isExpiringSoon) {
    return {
      status: "expiring_soon",
      endsAtFormatted,
      completedAtFormatted: null,
    };
  }

  const isCompleted =
    bounty.type === "performance"
      ? (bounty.submissions?.[0]?.performanceCount ?? 0) >=
        (bounty.performanceCondition?.value ?? 0)
      : (bounty.submissions?.filter((s) => s.status !== "draft").length ?? 0) >=
        (bounty.maxSubmissions ?? 1);

  if (isCompleted) {
    return {
      status: "completed",
      endsAtFormatted,
      completedAtFormatted: null,
    };
  }

  const daysSinceStart = differenceInDays(now, startsAt);
  const isNew = daysSinceStart <= NEW_BOUNTY_DAYS;

  if (isNew) {
    return {
      status: "new",
      endsAtFormatted,
      completedAtFormatted: null,
    };
  }

  return null;
}

export function BountyStatusBadge({ bounty }: { bounty: PartnerBountyProps }) {
  const state = getBountyBadgeState(bounty);

  if (!state) {
    return null;
  }

  const { status, endsAtFormatted, completedAtFormatted } = state;

  return (
    <div className="absolute left-2 top-2 z-10">
      {status === "expired" && endsAtFormatted && (
        <div className="flex h-5 items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
          Expired {endsAtFormatted}
        </div>
      )}

      {status === "expiring_soon" && endsAtFormatted && (
        <div className="flex h-5 items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
          Expiring soon {endsAtFormatted}
        </div>
      )}

      {status === "completed" && (
        <div className="flex h-5 items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
          {completedAtFormatted
            ? `Completed ${completedAtFormatted}`
            : "Completed"}
        </div>
      )}

      {status === "new" && (
        <StatusBadge variant="new" icon={null}>
          New
        </StatusBadge>
      )}
    </div>
  );
}
