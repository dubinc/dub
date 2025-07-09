import { EnrolledPartnerProps } from "@/lib/types";
import {
  Globe,
  Icon,
  Instagram,
  LinkedIn,
  TikTok,
  Twitter,
  YouTube,
} from "@dub/ui/icons";
import { cn, getPrettyUrl, nFormatter } from "@dub/utils";
import { Fragment } from "react";
import { OnlinePresenceCard } from "./online-presence-card";

const fields: {
  label: string;
  icon: Icon;
  data: (partner: EnrolledPartnerProps) => {
    value: string | null;
    verified: boolean;
    href: string | null;
    info?: string[];
  };
}[] = [
  {
    label: "Website",
    icon: Globe,
    data: (partner) => ({
      value: partner.website ? getPrettyUrl(partner.website) : null,
      verified: !!partner.websiteVerifiedAt,
      href: partner.website,
    }),
  },
  {
    label: "YouTube",
    icon: YouTube,
    data: (partner) => ({
      value: partner.youtube ? `@${partner.youtube}` : null,
      verified: !!partner.youtubeVerifiedAt,
      href: `https://youtube.com/@${partner.youtube}`,
      info: [
        partner.youtubeSubscriberCount > 0
          ? `${nFormatter(partner.youtubeSubscriberCount)} subscribers`
          : null,
        partner.youtubeViewCount > 0
          ? `${nFormatter(partner.youtubeViewCount)} views`
          : null,
      ].filter(Boolean),
    }),
  },
  {
    label: "X/Twitter",
    icon: Twitter,
    data: (partner) => ({
      value: partner.twitter ? `@${partner.twitter}` : null,
      verified: !!partner.twitterVerifiedAt,
      href: `https://x.com/${partner.twitter}`,
    }),
  },
  {
    label: "LinkedIn",
    icon: LinkedIn,
    data: (partner) => ({
      value: partner.linkedin,
      verified: !!partner.linkedinVerifiedAt,
      href: `https://linkedin.com/in/${partner.linkedin}`,
    }),
  },
  {
    label: "Instagram",
    icon: Instagram,
    data: (partner) => ({
      value: partner.instagram ? `@${partner.instagram}` : null,
      verified: !!partner.instagramVerifiedAt,
      href: `https://instagram.com/${partner.instagram}`,
    }),
  },
  {
    label: "Tiktok",
    icon: TikTok,
    data: (partner) => ({
      value: partner.tiktok ? `@${partner.tiktok}` : null,
      verified: !!partner.tiktokVerifiedAt,
      href: `https://tiktok.com/@${partner.tiktok}`,
    }),
  },
];

export function OnlinePresenceSummary({
  partner,
  className,
}: {
  partner: EnrolledPartnerProps;
  className?: string;
}) {
  const fieldData = fields
    .map((field) => ({
      label: field.label,
      icon: field.icon,
      ...field.data(partner),
    }))
    .filter((field) => field.value && field.href);

  return fieldData.length ? (
    <div
      className={cn(
        "grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-4 gap-y-5 text-sm md:gap-x-16",
        className,
      )}
    >
      {fieldData.map(({ label, icon: Icon, value, verified, href, info }) => {
        return (
          <Fragment key={label}>
            <span className="text-content-default font-medium">{label}</span>
            <div>
              <OnlinePresenceCard
                icon={Icon}
                value={value ?? ""}
                verified={verified}
                info={info}
                href={href ?? undefined}
              />
            </div>
          </Fragment>
        );
      })}
    </div>
  ) : (
    <div className={cn("text-sm italic text-neutral-400", className)}>
      No online presence provided
    </div>
  );
}
