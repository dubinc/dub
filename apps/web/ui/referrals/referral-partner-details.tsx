import { ReferralProps } from "@/lib/types";
import { OG_AVATAR_URL } from "@dub/utils";

interface ReferralPartnerDetailsProps {
  referral: ReferralProps;
}

export function ReferralPartnerDetails({
  referral,
}: ReferralPartnerDetailsProps) {
  return (
    <div className="border-border-subtle overflow-hidden rounded-xl border bg-white p-4">
      <h3 className="text-content-emphasis mb-4 text-sm font-semibold">
        Referral partner
      </h3>
      <div className="flex items-center gap-3">
        <img
          src={
            referral.partner.image || `${OG_AVATAR_URL}${referral.partner.id}`
          }
          alt={referral.partner.name}
          className="size-10 rounded-full border border-neutral-100"
        />
        <div className="text-content-emphasis text-sm font-medium">
          {referral.partner.name}
        </div>
      </div>
    </div>
  );
}
