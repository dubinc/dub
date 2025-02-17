import { EnrolledPartnerProps } from "@/lib/types";
import { DICEBEAR_AVATAR_URL } from "@dub/utils/src/constants";

// TODO:
// Co-locate this with the sheet component

export function PartnerRowItem({ partner }: { partner: EnrolledPartnerProps }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={partner.image || `${DICEBEAR_AVATAR_URL}${partner.name}`}
        alt={partner.name}
        className="size-5 rounded-full"
      />
      <div>{partner.name}</div>
    </div>
  );
}
