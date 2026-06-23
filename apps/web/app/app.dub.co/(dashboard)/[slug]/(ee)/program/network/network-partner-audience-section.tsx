"use client";

import { NetworkPartnerProps } from "@/lib/types";
import { cn } from "@dub/utils";
import { PartnerPlatformDisplayData } from "./network-partner-card-types";
import { PlatformStatCard } from "./platform-stat-card";

export function NetworkPartnerAudienceSection({
  partner,
  partnerPlatformsData,
}: {
  partner?: NetworkPartnerProps;
  partnerPlatformsData: PartnerPlatformDisplayData[] | null;
}) {
  return (
    <div className="border-border-subtle border-t p-4 pt-2">
      <span className="text-content-emphasis text-sm font-semibold">
        Audience
      </span>

      <div
        className={cn(
          "mt-2 grid grid-cols-6 gap-1",
          !partner && "animate-pulse",
        )}
      >
        {partnerPlatformsData
          ? partnerPlatformsData.map(
              ({
                label,
                icon: PlatformIcon,
                verified,
                stat,
                value,
                href,
                info,
                verifiedAt,
              }) => (
                <PlatformStatCard
                  key={label}
                  label={label}
                  icon={PlatformIcon}
                  verified={verified}
                  stat={stat}
                  value={value}
                  info={info}
                  verifiedAt={verifiedAt}
                  href={verified && href ? href : undefined}
                />
              ),
            )
          : [...Array(6)].map((_, idx) => (
              <div key={idx} className="bg-bg-subtle h-10 rounded-lg" />
            ))}
      </div>
    </div>
  );
}

export function getPlatformSortOrder({
  verified,
  value,
}: {
  verified: boolean;
  value?: string | null;
}) {
  if (verified) return 0;
  if (value) return 1;
  return 2;
}
