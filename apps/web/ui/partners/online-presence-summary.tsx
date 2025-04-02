import { EnrolledPartnerProps } from "@/lib/types";
import { Tooltip } from "@dub/ui";
import { BadgeCheck2Fill } from "@dub/ui/icons";
import { cn, getPrettyUrl } from "@dub/utils";
import { Fragment } from "react";

const fields: {
  label: string;
  data: (partner: EnrolledPartnerProps) => {
    value: string | null;
    verified: boolean;
    href: string | null;
  };
}[] = [
  {
    label: "Website",
    data: (partner) => ({
      value: partner.website ? getPrettyUrl(partner.website) : null,
      verified: !!partner.websiteVerifiedAt,
      href: partner.website,
    }),
  },
  {
    label: "Youtube",
    data: (partner) => ({
      value: partner.youtube ? `@${partner.youtube}` : null,
      verified: !!partner.youtubeVerifiedAt,
      href: `https://youtube.com/@${partner.youtube}`,
    }),
  },
  {
    label: "Twitter",
    data: (partner) => ({
      value: partner.twitter ? `@${partner.twitter}` : null,
      verified: !!partner.twitterVerifiedAt,
      href: `https://x.com/${partner.twitter}`,
    }),
  },
  {
    label: "LinkedIn",
    data: (partner) => ({
      value: partner.linkedin,
      verified: !!partner.linkedinVerifiedAt,
      href: `https://linkedin.com/in/${partner.linkedin}`,
    }),
  },
  {
    label: "Instagram",
    data: (partner) => ({
      value: partner.instagram ? `@${partner.instagram}` : null,
      verified: !!partner.instagramVerifiedAt,
      href: `https://instagram.com/${partner.instagram}`,
    }),
  },
  {
    label: "Tiktok",
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
    .map((field) => ({ label: field.label, ...field.data(partner) }))
    .filter((field) => field.value && field.href);

  return fieldData.length ? (
    <div
      className={cn(
        "grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-4 gap-y-1 text-sm md:gap-x-16",
        className,
      )}
    >
      {fieldData.map(({ label, value, verified, href }) => {
        return (
          <Fragment key={label}>
            <span className="font-medium text-neutral-600">{label}</span>
            <div>
              <a
                target="_blank"
                href={href!}
                rel="noopener noreferrer"
                className="inline-flex h-7 max-w-full items-center gap-1 rounded-lg px-2 text-neutral-600 hover:bg-neutral-50"
              >
                <span className="min-w-0 truncate">{value}</span>
                {verified && (
                  <Tooltip content="Verified" disableHoverableContent>
                    <div>
                      <BadgeCheck2Fill className="size-4 text-green-600" />
                    </div>
                  </Tooltip>
                )}
              </a>
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
