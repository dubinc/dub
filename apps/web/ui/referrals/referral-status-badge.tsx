import { ReferralStatus } from "@dub/prisma/client";
import { StatusBadge } from "@dub/ui";
import { ReferralStatusBadges } from "./referral-status-badges";

interface ReferralStatusBadgeProps {
  status: ReferralStatus;
  className?: string;
}

export function ReferralStatusBadge({
  status,
  className,
}: ReferralStatusBadgeProps) {
  const badge = ReferralStatusBadges[status];

  return (
    <StatusBadge
      variant={badge.variant}
      icon={null}
      className={`border-0 ${badge.className} ${className || ""}`}
    >
      {badge.label}
    </StatusBadge>
  );
}
