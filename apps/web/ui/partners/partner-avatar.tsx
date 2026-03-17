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
  const identifier = partner.id || partner.name || "unknown";

  return (
    <>
      <img
        src={partner.image || `${OG_AVATAR_URL}${identifier}`}
        alt={partner.name || partner.id || "Partner"}
        className={cn("shrink-0 rounded-full", className)}
      />
      {showName && partner.name}
    </>
  );
}
