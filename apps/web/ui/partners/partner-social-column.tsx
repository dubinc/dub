import { PARTNER_PLATFORM_FIELDS } from "@/lib/partners/partner-platforms";
import { PartnerPlatformProps } from "@/lib/types";
import { PlatformStatTooltipContent } from "@/ui/partners/platform-stat-tooltip";
import { BadgeCheck2, DynamicTooltipWrapper } from "@dub/ui";
import { getDomainWithoutWWW } from "@dub/utils";
import { PlatformType } from "@prisma/client";

const PLATFORMS_WITH_AT: PlatformType[] = [
  "youtube",
  "twitter",
  "instagram",
  "tiktok",
];

type SocialColumnPlatform = Pick<
  PartnerPlatformProps,
  "identifier" | "verifiedAt"
> & {
  subscribers?: bigint | number | null;
  posts?: bigint | number | null;
  views?: bigint | number | null;
};

export function PartnerSocialColumn({
  platform,
  platformName,
}: {
  platform: SocialColumnPlatform | null | undefined;
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
  const field = PARTNER_PLATFORM_FIELDS.find(
    (platformField) => platformField.type === platformName,
  );
  const stats = field?.data([
    {
      type: platformName,
      identifier: platform.identifier,
      verifiedAt: platform.verifiedAt ? new Date(platform.verifiedAt) : null,
      platformId: null,
      avatarUrl: null,
      subscribers: BigInt(platform.subscribers ?? 0),
      posts: BigInt(platform.posts ?? 0),
      views: BigInt(platform.views ?? 0),
    },
  ]);

  const content = (
    <div className="flex items-center gap-2">
      <span className="min-w-0 truncate">
        {needsAt && "@"}
        {value}
      </span>
      {verified && (
        <BadgeCheck2 variant="fill" className="size-4 text-green-600" />
      )}
    </div>
  );

  if (!field || !stats?.value) {
    return content;
  }

  return (
    <DynamicTooltipWrapper
      tooltipProps={{
        side: "top",
        content: (
          <PlatformStatTooltipContent
            icon={field.icon}
            value={stats.value}
            stat={stats.stat}
            info={stats.info}
            verifiedAt={stats.verifiedAt}
          />
        ),
      }}
    >
      {content}
    </DynamicTooltipWrapper>
  );
}
