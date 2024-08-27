import { BadgeCheck } from "lucide-react";

interface VerifiedBadgeProps {
  verified: boolean;
}

export function VerifiedBadge({ verified }: VerifiedBadgeProps) {
  if (!verified) return null;

  return (
    <span title="Verified by Dub">
      <BadgeCheck className="h-5 w-5 text-blue-600" />
    </span>
  );
}
