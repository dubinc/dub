import { ReferrerIcon } from "@/ui/analytics/referrer-icon";
import { Globe, Shop, UserArrowRight } from "@dub/ui/icons";

export function ApplicationReferralSourceIcon({
  referralSource,
  className,
}: {
  referralSource: string;
  className?: string;
}) {
  switch (referralSource) {
    case "marketplace":
      return <Shop className={className} />;
    case "direct":
      return <Globe className={className} />;
    case "manual":
      return <UserArrowRight className={className} />;
    default:
      return <ReferrerIcon display={referralSource} className={className} />;
  }
}
