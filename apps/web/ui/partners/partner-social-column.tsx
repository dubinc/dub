import { PartnerSocialPlatform } from "@/lib/types";
import { SocialPlatform } from "@dub/prisma/client";
import { BadgeCheck2Fill, Tooltip } from "@dub/ui";
import { getDomainWithoutWWW } from "@dub/utils";

const PLATFORMS_WITH_AT: SocialPlatform[] = [
  "youtube",
  "twitter",
  "instagram",
  "tiktok",
];

export function PartnerSocialColumn({
  platform,
  platformName,
}: {
  platform: PartnerSocialPlatform | null | undefined;
  platformName: SocialPlatform;
}) {
  if (!platform?.handle) {
    return "-";
  }

  const needsAt = PLATFORMS_WITH_AT.includes(platformName);
  const value =
    platformName === "website"
      ? getDomainWithoutWWW(platform.handle) ?? "-"
      : platform.handle;
  const verified = !!platform.verifiedAt;

  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 truncate">
        {needsAt && "@"}
        {value}
      </span>
      {verified && (
        <Tooltip content="Verified" disableHoverableContent>
          <div>
            <BadgeCheck2Fill className="size-4 text-green-600" />
          </div>
        </Tooltip>
      )}
    </div>
  );
}
