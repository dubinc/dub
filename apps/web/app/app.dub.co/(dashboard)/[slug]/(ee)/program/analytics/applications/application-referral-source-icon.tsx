import { ReferrerIcon } from "@/ui/analytics/referrer-icon";
import { Globe, Shop } from "@dub/ui/icons";

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
    default:
      return <ReferrerIcon display={referralSource} />;
  }
}
