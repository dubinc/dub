import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { CopyText, Tooltip } from "@dub/ui";
import { CircleHalfDottedClock } from "@dub/ui/icons";
import { formatDateSmart, formatDateTime, OG_AVATAR_URL } from "@dub/utils";
import { addBusinessDays } from "date-fns";

type PayoutPaidCellUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
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
                src={user.image || `${OG_AVATAR_URL}${user.id}`}
                alt={user.name ?? user.email ?? user.id}
                className="size-6 shrink-0 rounded-full"
              />
              <p className="text-sm font-medium">
                {user.name ?? user.email ?? user.id}
              </p>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <ProcessingIcon className="size-3 shrink-0 text-blue-600" />
            <span>
              Payment initiated at{" "}
              <CopyText
                value={formatDateTime(initiatedAt, {
                  month: "short",
                })}
                className="text-xs font-medium text-neutral-700"
              >
                {formatDateTime(initiatedAt, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                })}
              </CopyText>
            </span>
          </div>
          {paidAt ? (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <CompletedIcon className="size-3 shrink-0 text-green-600" />
              <span>
                Payment completed at{" "}
                <CopyText
                  value={formatDateTime(paidAt, {
                    month: "short",
                  })}
                  className="text-xs font-medium text-neutral-700"
                >
                  {formatDateTime(paidAt, {
                    month: "short",
                  })}
                </CopyText>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <CircleHalfDottedClock className="size-3 shrink-0 text-amber-600" />
              <span>
                Expected to settle at{" "}
                <CopyText
                  value={formatDateTime(addBusinessDays(initiatedAt, 5), {
                    month: "short",
                  })}
                  className="text-xs font-medium text-neutral-700"
                >
                  {formatDateTime(addBusinessDays(initiatedAt, 5), {
                    month: "short",
                  })}
                </CopyText>
              </span>
            </div>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-2">
        {user && (
          <img
            src={user.image || `${OG_AVATAR_URL}${user.id}`}
            alt={user.name ?? user.email ?? user.id}
            className="size-5 shrink-0 rounded-full"
          />
        )}
        {paidAt ? (
          <span className="hover:text-content-emphasis underline decoration-dotted underline-offset-2">
            {formatDateSmart(paidAt, {
              month: "short",
            })}
          </span>
        ) : (
          <span className="hover:text-content-emphasis text-content-muted flex items-center gap-1 underline decoration-dotted underline-offset-2">
            <CircleHalfDottedClock className="size-3.5 shrink-0" />{" "}
            {formatDateSmart(initiatedAt, {
              month: "short",
            })}
          </span>
        )}
      </div>
    </Tooltip>
  );
}
