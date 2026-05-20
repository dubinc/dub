import { ReferrerIcon } from "@/ui/analytics/referrer-icon";
import { Globe, Shop, UserArrowRight } from "@dub/ui/icons";

export function ApplicationReferralSourceIcon({
  referralSource,
}: {
  referralSource: string;
}) {
  switch (referralSource) {
    case "marketplace":
      return <Shop />;
    case "direct":
      return <Globe />;
    case "manual":
      return <UserArrowRight />;
    default:
      return <ReferrerIcon display={referralSource} />;
  }
}
