import { SubmittedLeadStatus } from "@dub/prisma/client";
import { StatusBadge } from "@dub/ui";
import { SubmittedLeadStatusBadges } from "./submitted-lead-status-badges";

interface SubmittedLeadStatusBadgeProps {
  status: SubmittedLeadStatus;
  className?: string;
}

export function SubmittedLeadStatusBadge({
  status,
  className,
}: SubmittedLeadStatusBadgeProps) {
  const badge = SubmittedLeadStatusBadges[status];

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
