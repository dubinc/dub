import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { Tooltip } from "@dub/ui";
import { formatDate, formatDateTime, OG_AVATAR_URL } from "@dub/utils";

type PayoutPaidCellUser = {
  id?: string;
  name?: string | null;
  image?: string | null;
} | null;

type PayoutPaidCellProps = {
  initiatedAt?: string | Date | null;
  paidAt?: string | Date | null;
  user?: PayoutPaidCellUser;
};

export function PayoutPaidCell({
  initiatedAt,
  paidAt,
  user,
}: PayoutPaidCellProps) {
  const ProcessingIcon = PayoutStatusBadges.processing.icon;
  const CompletedIcon = PayoutStatusBadges.completed.icon;

  if (!initiatedAt) {
    return "-";
  }

  return (
    <Tooltip
      content={
        <div className="flex flex-col gap-1 p-2.5">
          {user && (
            <div className="flex flex-col gap-2">
              <img
                src={user.image || `${OG_AVATAR_URL}${user.name}`}
                alt={user.name ?? user.id}
                className="size-6 shrink-0 rounded-full"
              />
              <p className="text-sm font-medium">{user.name}</p>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <ProcessingIcon className="size-3 shrink-0 text-blue-600" />
            <span>
              Payment initiated at{" "}
              <span className="font-medium text-neutral-700">
                {formatDateTime(initiatedAt, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                })}
              </span>
            </span>
          </div>
          {paidAt && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <CompletedIcon className="size-3 shrink-0 text-green-600" />
              <span>
                Payment completed at{" "}
                <span className="font-medium text-neutral-700">
                  {formatDateTime(paidAt, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                  })}
                </span>
              </span>
            </div>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-2">
        {user && (
          <img
            src={user.image || `${OG_AVATAR_URL}${user.name}`}
            alt={user.name ?? user.id}
            className="size-5 shrink-0 rounded-full"
          />
        )}
        {formatDate(initiatedAt, {
          month: "short",
          year: undefined,
        })}
      </div>
    </Tooltip>
  );
}
