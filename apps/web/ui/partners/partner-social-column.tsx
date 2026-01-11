import { PartnerPlatformProps } from "@/lib/types";
import { PlatformType } from "@dub/prisma/client";
import { BadgeCheck2Fill, Tooltip } from "@dub/ui";
import { getDomainWithoutWWW } from "@dub/utils";

const PLATFORMS_WITH_AT: PlatformType[] = [
  "youtube",
  "twitter",
  "instagram",
  "tiktok",
];

export function PartnerSocialColumn({
  platform,
  platformName,
}: {
  platform: PartnerPlatformProps | null | undefined;
  platformName: PlatformType;
}) {
  if (!platform?.identifier) {
    return "-";
  }

  const needsAt = PLATFORMS_WITH_AT.includes(platformName);
  const value =
    platformName === "website"
      ? getDomainWithoutWWW(platform.identifier) ?? "-"
      : platform.identifier;
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
