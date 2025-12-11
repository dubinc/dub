import { PartnerRewindProps } from "@/lib/types";

export function Rewind({
  partnerRewind,
  onComplete,
}: {
  partnerRewind: PartnerRewindProps;
  onComplete: () => void;
}) {
  return <div>[rewind]</div>;
}
