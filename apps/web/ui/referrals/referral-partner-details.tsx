import { ReferralProps } from "@/lib/types";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
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
      <h3 className="text-content-emphasis mb-2.5 text-sm font-semibold">
        Referral partner
      </h3>
      <Link
        href={`/${slug}/program/partners/${referral.partner.id}`}
        target="_blank"
        className="flex items-center gap-2 transition-opacity hover:opacity-80"
      >
        <PartnerAvatar
          partner={referral.partner}
          className="size-5 border border-neutral-100"
        />
        <div className="text-content-emphasis cursor-alias text-sm font-semibold decoration-dotted hover:underline">
          {referral.partner.name}
        </div>
      </Link>
    </div>
  );
}
