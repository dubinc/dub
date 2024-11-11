import { DotsPayoutPlatform } from "@/lib/dots/types";
import { DOTS_PAYOUT_PLATFORMS } from "../dots/platforms";

export const PlatformBadge = ({
  platform,
}: {
  platform: DotsPayoutPlatform;
}) => {
  const { icon: Icon, name } =
    DOTS_PAYOUT_PLATFORMS.find((p) => p.id === platform) ||
    DOTS_PAYOUT_PLATFORMS[0];

  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4" />
      <span>{name}</span>
    </div>
  );
};
