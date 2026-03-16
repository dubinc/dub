import { NullableOptional, PartnerProps } from "@/lib/types";
import { cn, OG_AVATAR_URL } from "@dub/utils";

export function PartnerAvatar({
  partner,
  className,
  showName = false,
}: {
  partner: NullableOptional<PartnerProps>;
  className?: string;
  showName?: boolean;
}) {
  return (
    <>
      <img
        src={partner.image || `${OG_AVATAR_URL}${partner.id || partner.name}`}
        alt={partner.name || partner.id || ""}
        className={cn("shrink-0 rounded-full", className)}
      />
      {showName && partner.name}
    </>
  );
}
