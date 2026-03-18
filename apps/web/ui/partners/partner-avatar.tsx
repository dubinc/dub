import { NullableOptional, PartnerProps } from "@/lib/types";
import { Avatar } from "@/ui/avatar";

export function PartnerAvatar({
  partner,
  className,
  showName = false,
}: {
  partner: NullableOptional<PartnerProps>;
  className?: string;
  showName?: boolean;
}) {
  const identifier = partner.name || partner.id || "Unknown";
  const displayName = partner.name || partner.id || "Partner";

  return (
    <Avatar
      imageUrl={partner.image}
      identifier={identifier}
      displayName={displayName}
      showName={showName}
      className={className}
    />
  );
}
