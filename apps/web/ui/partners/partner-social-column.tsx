import { PartnerPlatformProps } from "@/lib/types";
import { PlatformType } from "@dub/prisma/client";
import { BadgeCheck2Fill, TimestampTooltip } from "@dub/ui";
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
  platform:
    | Pick<PartnerPlatformProps, "identifier" | "verifiedAt">
    | null
    | undefined;
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
        <TimestampTooltip
          timestamp={platform.verifiedAt}
          rows={["local", "utc", "unix"]}
          side="top"
          prefix="Verified"
          delayDuration={150}
        >
          <div>
            <BadgeCheck2Fill className="size-4 text-green-600" />
          </div>
        </TimestampTooltip>
      )}
    </div>
  );
}
