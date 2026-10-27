import { EnrolledPartnerProps } from "@/lib/types";
import { BAN_PARTNER_REASONS } from "@/lib/zod/schemas/partners";
import { DynamicTooltipWrapper, StatusBadge } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { PartnerStatusBadges } from "./partner-status-badges";

export const PartnerStatusBadgeWithTooltip = ({
  partner,
  size = "md",
}: {
  partner: Pick<EnrolledPartnerProps, "status" | "bannedAt" | "bannedReason">;
  size?: "sm" | "md";
}) => {
  const badge = PartnerStatusBadges[partner.status];
  return (
    <DynamicTooltipWrapper
      {...(partner.status === "banned" &&
      partner.bannedAt &&
      partner.bannedReason
        ? {
            tooltipProps: {
              content: (
                <div className="w-60 p-4">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-red-500" />
                    <div className="text-sm font-medium text-neutral-700">
                      Banned
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">Date</span>
                      <span className="text-xs font-medium text-neutral-700">
                        {formatDate(partner.bannedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">Reason</span>
                      <span className="text-xs font-medium text-neutral-700">
                        {BAN_PARTNER_REASONS[partner.bannedReason]}
                      </span>
                    </div>
                  </div>
                </div>
              ),
              align: "start",
              contentClassName: "text-left w-60",
            },
          }
        : {})}
    >
      <StatusBadge icon={null} variant={badge.variant} size={size}>
        {badge.label}
      </StatusBadge>
    </DynamicTooltipWrapper>
  );
};
