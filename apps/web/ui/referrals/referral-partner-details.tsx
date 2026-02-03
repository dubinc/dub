import { ReferralProps } from "@/lib/types";
import { OG_AVATAR_URL } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ReferralPartnerDetailsProps {
  referral: ReferralProps;
}

export function ReferralPartnerDetails({
  referral,
}: ReferralPartnerDetailsProps) {
  const { slug } = useParams();

  return (
    <div className="border-border-subtle overflow-hidden rounded-xl border bg-white p-4">
      <h3 className="text-content-emphasis mb-4 text-sm font-semibold">
        Referral partner
      </h3>
      <Link
        href={`/${slug}/program/partners/${referral.partner.id}`}
        target="_blank"
        className="flex items-center gap-2 transition-opacity hover:opacity-80"
      >
        <img
          src={
            referral.partner.image || `${OG_AVATAR_URL}${referral.partner.id}`
          }
          alt={referral.partner.name}
          className="size-5 rounded-full border border-neutral-100"
        />
        <div className="text-content-emphasis cursor-alias text-sm font-semibold decoration-dotted hover:underline">
          {referral.partner.name}
        </div>
      </Link>
    </div>
  );
}
