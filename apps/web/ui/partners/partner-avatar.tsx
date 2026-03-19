import { NullableOptional, PartnerProps } from "@/lib/types";
import { Avatar } from "@/ui/avatar";

export function PartnerAvatar({
  partner,
  className,
}: {
  partner: NullableOptional<PartnerProps>;
  className?: string;
}) {
  return (
    <Avatar
      imageUrl={partner.image}
      identifier={partner.id || partner.name || partner.email || "Unknown"}
      className={className}
    />
  );
}
